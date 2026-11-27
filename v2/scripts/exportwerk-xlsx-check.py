import zipfile
from openpyxl import load_workbook
p='/tmp/exportwerk.xlsx'
with zipfile.ZipFile(p) as z: assert z.testzip() is None
w=load_workbook(p)
assert w.sheetnames==['Dashboard','Oktlogg','Settlogg','Styrke','Belastning','Datakvalitet','Lister']
assert len(w['Dashboard']._charts)==2
assert len(w['Dashboard'].data_validations.dataValidation)==2
assert w['Oktlogg']['C2'].value=='=1+1' and w['Oktlogg']['C2'].data_type=='s'
assert w['Settlogg']['G2'].value==5 and w['Settlogg']['H2'].value==20
assert w['Settlogg']['G3'].value==0 and w['Settlogg']['H3'].value is None
assert w['Settlogg']['K2'].data_type=='f'
assert w['Dashboard']['B7'].value.startswith('=COUNTIFS(')
assert '"<="&$B$4' in w['Dashboard']['B7'].value
assert w['Belastning']['D2'].data_type=='f'
assert w['Oktlogg'].auto_filter.ref
print('EXPORTWERK XLSX verified: native charts, validation, formulas, numeric and null preservation, non-executable text')
