import { LightningElement, track, api } from "lwc";
import fetchdata from "@salesforce/apex/uploadController.fetchdata";

export default class DisplayImages extends LightningElement {
  @api recordId;
  @track reloadComponentVar = false;
  @track data = [];
  @track showSpinner = false;
  @track isdata = false;

  @track currentIndex = 0;

  connectedCallback() {
    this.showSpinner = true;
    this.data = this.fetchingdata();
    this.showSpinner = false;
  }

  fetchingdata() {
    fetchdata({ recordId: this.recordId })
      .then((result) => {
        this.data = result;
        this.isdata = result && result.length > 0;

        console.log(result);
      })
      .catch((error) => {
        console.error("Error fetching data:", error);
      });
  }

  get currentImageUrl() {
    return this.data && this.data.length > 0
      ? this.data[this.currentIndex].FilenameUrlEncoded__c
      : "";
  }

  get currentImageName() {
    return this.data && this.data.length > 0
      ? this.data[this.currentIndex].Name
      : "";
  }

  showPreviousImage() {
    this.showSpinner = true;
    if (this.currentIndex > 0) {
      this.currentIndex--;
      this.showSpinner = false;
    } else {
      this.currentIndex = this.data.length - 1;
      this.showSpinner = false;
    }
  }

  showNextImage() {
    this.showSpinner = true;
    if (this.currentIndex < this.data.length - 1) {
      this.currentIndex++;
      this.showSpinner = false;
    } else {
      this.currentIndex = 0;
      this.showSpinner = false;
    }
  }

  reloadComponent() {
    this.showSpinner = true;
    this.fetchingdata();
    this.currentIndex = 0;
    this.showSpinner = false;
  }

  openImagePreview() {
    this.showSpinner = true;
    const imageUrl = this.currentImageUrl;
    if (imageUrl) {
      window.open(imageUrl, "_blank");
      this.showSpinner = false;
    } else {
      console.error("No image URL available.");
    }
  }
}
