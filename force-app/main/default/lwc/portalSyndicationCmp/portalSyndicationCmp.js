import { LightningElement, track } from "lwc";
import portalSyndicationData from "./portalSyndicationData";
import { loadStyle } from "lightning/platformResourceLoader";
import overrideCSS from "@salesforce/resourceUrl/overrideCSS";

const columns = [
  { label: "Portal Name", fieldName: "name", hideDefaultActions: true },
  {
    label: "Portal Status",
    type: "customName",
    typeAttributes: {
      status: { fieldName: "status" },
      class: { fieldName: "badgeColor" }
    },
    hideDefaultActions: true
  },
  {
    type: "button",
    typeAttributes: {
      label: { fieldName: "buttonLabel" },
      name: "publish",
      variant: { fieldName: "buttonColor" }
    }
  }
];

export default class PortalSyndicationCmp extends LightningElement {
  hasLoadedStyle = false;
  data = [];
  flag = false;
  columns = columns;

  connectedCallback() {
    const data = portalSyndicationData({ amountOfRecords: 100 });
    this.data = data;
  }

  renderedCallback() {
    if (!this.hasLoadedStyle) {
      this.hasLoadedStyle = true;
      Promise.all([loadStyle(this, overrideCSS)]).then(() => {
        console.log("Styles loaded");
      });
    }
  }

  handleRowAction(event) {
    let rowId = event.detail.row.Id;
    if (event.detail.action.name === "publish") {
      this.handleButtonClick(this.data, rowId);
    }
  }

  handleButtonClick(data, rowId) {
    data.forEach((element) => {
      if (rowId === element.Id) {
        if (this.flag === true) {
          this.flag = false;
          element.buttonColor = "brand";
          element.buttonLabel = "Publish";
          element.status = "inactive";
          element.badgeColor = "slds-badge";
        } else {
          this.flag = true;
          element.buttonColor = "destructive";
          element.buttonLabel = "Unpublish";
          element.status = "active";
          element.badgeColor = "slds-badge slds-theme_success";
        }
      }
    });

    let newList = [...data];
    this.data = newList;
  }
}
