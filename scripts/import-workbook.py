#!/usr/bin/env python3
"""Read a read-only XLSX snapshot. Produce a private, reviewable cutover manifest.
No network calls, no workbook edits, no automatic email/date guessing.
"""
import argparse, datetime as dt, hashlib, json, re, uuid, zipfile
import xml.etree.ElementTree as ET
from pathlib import Path
N={'s':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
def workbook(path):
    with zipfile.ZipFile(path) as z:
        if sum(x.file_size for x in z.infolist())>100*1024*1024: raise ValueError('Workbook quá lớn')
        strings=[''.join(t.text or '' for t in n.findall('.//s:t',N)) for n in ET.fromstring(z.read('xl/sharedStrings.xml'))] if 'xl/sharedStrings.xml' in z.namelist() else []
        rels={r.attrib['Id']:r.attrib['Target'] for r in ET.fromstring(z.read('xl/_rels/workbook.xml.rels'))}
        result={}
        for sheet in ET.fromstring(z.read('xl/workbook.xml')).find('s:sheets',N):
            title=sheet.attrib['name']
            if title=='.webhook': continue
            target=rels[sheet.attrib['{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id']]
            target=target.lstrip('/') if target.startswith('/') else 'xl/'+target
            cells={}
            for cell in ET.fromstring(z.read(target)).findall('.//s:sheetData/s:row/s:c',N):
                v=cell.find('s:v',N); value=v.text if v is not None else ''.join(t.text or '' for t in cell.findall('.//s:t',N))
                if cell.attrib.get('t')=='s' and value: value=strings[int(value)]
                cells[cell.attrib['r']]=value or ''
            result[title]=cells
        return result

def integer(value,where,errors):
    try:
        n=float(value or 0)
        if not n.is_integer() or abs(n)>9007199254740991: raise ValueError()
        return int(n)
    except (ValueError,TypeError,OverflowError): errors.append(f'{where}: không phải số nguyên VND hợp lệ');return 0

def prepare(sheets,mapping,week,collector_id):
    date=dt.date.fromisoformat(week)
    if date.weekday()!=0: raise ValueError('week phải là thứ Hai')
    errors=[];unresolved=set();seen=set();balances=[];days=[]
    def member(name):
        key=' '.join(str(name).split()).casefold()
        candidates=[v for k,v in mapping.items() if ' '.join(k.split()).casefold()==key]
        if len(candidates)!=1: unresolved.add(name);return None
        try: return str(uuid.UUID(candidates[0]))
        except (ValueError,TypeError): errors.append(f'ID không hợp lệ: {name}');return None
    summary=sheets.get('Sao kê của Nghia')
    if summary is None: errors.append('Thiếu sheet sao kê');summary={}
    for row in range(3,27):
        name=summary.get(f'C{row}','').strip()
        if not name: continue
        mid=member(name)
        if mid in seen: errors.append(f'Trùng ánh xạ sao kê: {name}')
        if mid: seen.add(mid)
        amount=integer(summary.get(f'L{row}'),f'L{row}',errors)
        if mid: balances.append({'memberId':mid,'amount':0 if mid==collector_id else amount})
    for offset in range(5):
        name=f'Nghĩa Beluga T{offset+2}';cells=sheets.get(name)
        if cells is None: errors.append(f'Thiếu {name}');continue
        orders=[];per_member=set();day_total=0
        for row in range(6,34):
            person=cells.get(f'D{row}','').strip();food=cells.get(f'E{row}','').strip()
            if not food: continue
            mid=member(person);quantity=integer(cells.get(f'G{row}'),f'{name}!G{row}',errors);price=integer(cells.get(f'I{row}'),f'{name}!I{row}',errors)
            if quantity<1 or quantity>100 or price<0: errors.append(f'{name} dòng {row}: số lượng/giá không hợp lệ')
            day_total+=quantity*price
            if mid in per_member: errors.append(f'{name}: trùng người {person}, cần gộp thủ công')
            if mid: per_member.add(mid);orders.append({'memberId':mid,'items':[{'name':food,'quantity':quantity,'note':cells.get(f'F{row}',''),'unitPrice':price}]})
        expected=integer(cells.get('J34'),f'{name}!J34',errors)
        if day_total!=expected: errors.append(f'{name}: tổng đơn {day_total} khác J34 {expected}')
        days.append({'date':str(date+dt.timedelta(days=offset)),'orders':orders,'originalTotal':expected,'vendorTotal':integer(cells.get('L34'),f'{name}!L34',errors)})
    for name in sorted(unresolved):errors.append(f'Chưa ánh xạ thành viên: {name}')
    if not collector_id:errors.append('Cần ID người thu để tách phần tự trả')
    return {'canApply':not errors,'errors':errors,'unresolvedMembers':sorted(unresolved),'totals':{'orders':sum(len(d['orders']) for d in days),'originalVnd':sum(d['originalTotal'] for d in days),'openingBalanceVnd':sum(b['amount'] for b in balances)},'payload':{'batchId':str(uuid.uuid4()),'weekStart':week,'balances':balances,'days':days,'reconciled':False}}

def main():
    p=argparse.ArgumentParser();p.add_argument('workbook');p.add_argument('--mapping',required=True);p.add_argument('--week',required=True);p.add_argument('--collector-id',required=True);p.add_argument('--output',required=True);a=p.parse_args()
    report=prepare(workbook(a.workbook),json.loads(Path(a.mapping).read_text()),a.week,a.collector_id)
    report['payload']['fingerprint']=hashlib.sha256(Path(a.workbook).read_bytes()+a.week.encode()).hexdigest()
    output=Path(a.output);output.parent.mkdir(parents=True,exist_ok=True);output.write_text(json.dumps(report,ensure_ascii=False,indent=2));output.chmod(0o600)
    print(json.dumps({'canApply':report['canApply'],'errors':len(report['errors']),'totals':report['totals'],'output':str(output)},ensure_ascii=False))
if __name__=='__main__':main()
