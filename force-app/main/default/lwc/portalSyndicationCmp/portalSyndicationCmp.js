import { LightningElement } from "lwc";
import portalSyndicationData from "./portalSyndicationData";
import { loadStyle } from "lightning/platformResourceLoader";
import overrideCSS from "@salesforce/resourceUrl/overrideCSS";

const columns = [
  { label: "Portal Name", fieldName: "name", hideDefaultActions: true },
  {
    label: "Portal Status",
    type: "customName",
    typeAttributes: {
      status: { fieldName: "status" }
    },
    hideDefaultActions: true
  },
  {
    type: "button",
    typeAttributes: {
      label: "Publish",
      name: "publish",
      variant: "brand"
    }
  }
];

export default class PortalSyndicationCmp extends LightningElement {
  hasLoadedStyle = false;
  data = [];
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
}
