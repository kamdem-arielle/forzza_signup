import { Injectable } from '@angular/core';
import { Workbook } from 'devextreme-exceljs-fork';
import { saveAs } from 'file-saver';
import { exportDataGrid } from 'devextreme/excel_exporter';

 @Injectable({
  providedIn: 'root'
})

export class CoreService {
  constructor() {}

  onExporting(e:any,filename:string) {
        e.component.beginUpdate();
        e.component.columnOption('ID', 'visible', true);
        const workbook = new Workbook();
        const worksheet = workbook.addWorksheet('Transactions');
 
        exportDataGrid({
            component: e.component,
            worksheet: worksheet
        }).then(function() {
            workbook.xlsx.writeBuffer().then(function(buffer: BlobPart) {
                saveAs(new Blob([buffer], { type: 'application/octet-stream' }), filename);
            });
        }).then(function() {
            e.component.columnOption('ID', 'visible', false);
            e.component.endUpdate();
        });
    }

}