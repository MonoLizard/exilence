import { SelectionModel } from '@angular/cdk/collections';
import { Component, Input, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { MatDialog, MatSort, MatTableDataSource } from '@angular/material';
import { Subscription } from 'rxjs';

import { StashStore } from '../../../shared/interfaces/settings-store.interface';
import { Stash, Tab } from '../../../shared/interfaces/stash.interface';
import { AlertService } from '../../../shared/providers/alert.service';
import { ExternalService } from '../../../shared/providers/external.service';
import { PartyService } from '../../../shared/providers/party.service';
import { SettingsService } from '../../../shared/providers/settings.service';
import { MaptabInfoDialogComponent } from './maptab-info-dialog/maptab-info-dialog.component';

@Component({
  selector: 'app-stashtab-list',
  templateUrl: './stashtab-list.component.html',
  styleUrls: ['./stashtab-list.component.scss']
})
export class StashtabListComponent implements OnInit, OnDestroy {

  displayedColumns: string[] = ['select', 'position', 'name'];
  searchText = '';
  filteredArr = [];
  source: any;
  dataSource: any;
  dialogIsOpen = false;
  @ViewChild(MatSort) sort: MatSort;
  @Input() validated: boolean;

  selection = new SelectionModel<any>(true, []);
  private stashTabSub: Subscription;
  constructor(
    private settingsService: SettingsService,
    private externalService: ExternalService,
    private alertService: AlertService,
    private maptabDialog: MatDialog
  ) { }

  ngOnInit() {
    // temporarily until implemented
    this.init();

    this.settingsService.isChangingStash = true;
  }

  init() {
    const accountName = this.settingsService.get('profile.accountName');
    const league = this.settingsService.getCurrentLeague();

    let selectedStashTabs: StashStore[] = league.stashtabs;

    if (selectedStashTabs === undefined) {
      selectedStashTabs = [];
    }

    this.stashTabSub = this.externalService.getStashTabs(accountName, league.name)
      .subscribe((res: Stash) => {
        if (res !== null) {
          this.dataSource = res.tabs.map((tab: Tab) => {
            return { position: tab.i, name: tab.n, isMapTab: tab.type === 'MapStash' };
          });

          const fetchedMapStash = this.dataSource.find(x => x.isMapTab);
          const toggleableRows = [];
          this.dataSource.forEach(r => {
            selectedStashTabs.forEach(t => {
              const shouldDeselectMaptab = fetchedMapStash !== undefined && t.position === fetchedMapStash.position && !t.isMapTab;
              if (r.position === t.position && !shouldDeselectMaptab) {
                toggleableRows.push(r);
              }
            });
          });
          this.toggleAll(this.selection, toggleableRows);

          this.filter();
        }
      });
  }

  doSearch(text: string) {
    this.searchText = text;
    this.filter();
  }

  filter() {
    this.filteredArr = [...this.dataSource];
    this.filteredArr = this.filteredArr.filter(item =>
      Object.keys(item).some(k => item[k] != null && item[k] !== '' &&
        item[k].toString().toLowerCase()
          .includes(this.searchText.toLowerCase()))
    );

    this.source = new MatTableDataSource(this.filteredArr);
    this.source.sort = this.sort;
  }

  checkSelectionLength(row) {
    if (this.selection.selected.length > 40 && !this.selection.isSelected(row)) {
      this.showAlert();
    }
  }

  openMaptabDialog(): void {
    this.dialogIsOpen = true;
    const dialogRef = this.maptabDialog.open(MaptabInfoDialogComponent, {
      width: '650px'
    });
    dialogRef.afterClosed().subscribe(result => {
      this.dialogIsOpen = false;
    });
  }

  showAlert() {
    this.alertService.showAlert({ message: 'You can select at most 40 stash tabs', action: 'OK' });
  }

  shouldToggle(selection, row) {
    const mapTabSelected = selection.selected.find(x => x.position === row.position) !== undefined;
    if (row.isMapTab && !mapTabSelected && !this.dialogIsOpen) {
      this.openMaptabDialog();
    }
    this.toggleAll(selection, [row]);
  }

  updateStashtabs(stashtabs: StashStore[]) {
    const league = this.settingsService.getCurrentLeague();
    league.stashtabs = stashtabs;
    this.settingsService.updateLeague(league);
  }

  toggleAll(selection, rows) {
    for (const row of rows) {
      this.selection.toggle(row);
    }
    this.updateStashtabs(selection.selected);
  }

  /** Whether the number of selected elements matches the total number of rows. */
  isAllSelected() {
    const numSelected = this.selection.selected.length;
    const numRows = this.source.data.length;
    return numSelected === numRows;
  }

  /** Selects all rows if they are not all selected; otherwise clear selection. */
  masterToggle() {
    this.isAllSelected() || this.selection.selected.length >= 40 ?
      this.selection.clear() :
      this.source.data.forEach(row => {
        if (this.selection.selected.length < 41) {
          const mapTabSelected = this.selection.selected.find(x => x.position === row.position) !== undefined;
          if (row.isMapTab && !mapTabSelected && !this.dialogIsOpen) {
            this.openMaptabDialog();
          }
          this.selection.select(row);
        } else { this.showAlert(); }
      });

      this.updateStashtabs(this.selection.selected);
  }

  ngOnDestroy() {
    if (this.stashTabSub !== undefined) {
      this.stashTabSub.unsubscribe();
    }
    this.settingsService.isChangingStash = false;
  }

}
