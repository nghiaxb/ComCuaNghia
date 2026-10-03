import unittest, importlib.util
spec=importlib.util.spec_from_file_location('importer','scripts/import-workbook.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
class ImportTests(unittest.TestCase):
 def test_missing_mapping_blocks_apply(self):
  r=m.prepare({'Sao kê của Nghia':{'C3':'A','L3':'35000'}},{},'2026-10-05','11111111-1111-4111-8111-111111111111');self.assertFalse(r['canApply']);self.assertIn('A',r['unresolvedMembers'])
 def test_never_infers_week(self):
  with self.assertRaises(ValueError):m.prepare({}, {},'2026-10-06','')
 def test_duplicate_mapping_blocks_apply(self):
  mid='11111111-1111-4111-8111-111111111111';r=m.prepare({'Sao kê của Nghia':{'C3':'A','L3':'1','C4':'B','L4':'2'}},{'A':mid,'B':mid},'2026-10-05',mid);self.assertTrue(any('Trùng ánh xạ' in e for e in r['errors']))
if __name__=='__main__':unittest.main()
