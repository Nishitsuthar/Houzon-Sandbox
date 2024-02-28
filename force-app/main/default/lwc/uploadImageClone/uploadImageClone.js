import { LightningElement, track, api } from "lwc";
import getS3ConfigData from "@salesforce/apex/S3Service.getS3ConfigSettings";
import { loadScript } from "lightning/platformResourceLoader";
import AWS_SDK from "@salesforce/resourceUrl/AWSSDK";
import fetchdata from "@salesforce/apex/uploadController.fetchdata";
import createmedia from "@salesforce/apex/uploadController.createmedia";
import deletemedia from "@salesforce/apex/uploadController.deletemedia";
import { ShowToastEvent } from "lightning/platformShowToastEvent";

export default class UploadImageClone extends LightningElement {
  @api recordId;
  /*========= Start - variable declaration =========*/
  s3; //store AWS S3 object
  isAwsSdkInitialized = false; //flag to check if AWS SDK initialized
  @track selectedFilesToUpload; //store selected file
  @track showSpinner = false; //used for when to show spinner
  @track fileName; //to display the selected file name
  @track uploadProgress = 0;
  @track fileSize;
  @track isfileuploading = false;
  @track data = [];
  @track isModalOpen = false;
  @track modalImageUrl;
  @track isnull = true;
  @track isdata = false;

  showImageInModal(imageUrl) {
    this.modalImageUrl = imageUrl;
    this.isModalOpen = true;
  }

  async handleDelete(recid) {
    try {
      this.showSpinner = true;
      await deletemedia({ id: recid });
      this.fetchingdata();
    } catch (error) {
      console.error("Error deleting media:", error);
    } finally {
      this.showSpinner = false;
    }
  }

  removefile() {
    this.selectedFilesToUpload = null;
    this.fileName = null;
    this.fileSize = null;
    this.isnull = true;
  }

  closeModal() {
    this.isModalOpen = false;
  }

  columns = [
    {
      label: "Thumbnail",
      fieldName: "FilenameUrlEncoded__c",
      type: "customImage"
    },
    { label: "Title", fieldName: "Name" },

    { label: "Size (kb)", fieldName: "Size__c", type: "formattedSize" },
    {
      label: "View",
      type: "button",
      typeAttributes: {
        label: "View",
        name: "view",
        variant: "brand",
        title: "View"
      }
    },
    {
      label: "Action",
      type: "button",
      typeAttributes: {
        label: "Remove",
        name: "delete",
        variant: "destructive",
        title: "Delete"
      }
    }
  ];

  get formattedData() {
    // Add 'kb' to the size field and return the modified data
    return this.data.map((item) => ({
      ...item,
      Size__c: `${item.Size__c} kb`
    }));
  }

  handleRowAction(event) {
    const action = event.detail.action;
    const row = event.detail.row;

    // eslint-disable-next-line no-use-before-define
    switch (action.name) {
      case "view":
        this.showImageInModal(row.FilenameUrlEncoded__c);
        break;
      case "delete":
        this.handleDelete(row.Id); // Call the delete method with the record Id
        break;
      // Add more actions as needed
    }
  }

  confData;
  fileURL = "";

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

  connectedCallback() {
    this.showSpinner = true;
    this.getS3ConfigDataAsync();
    this.fetchingdata();
    this.showSpinner = false;
  }

  async getS3ConfigDataAsync() {
    try {
      this.confData = await getS3ConfigData();
      console.log("check data ", this.confData);
    } catch (error) {
      console.log("error in async ", error);
    }
  }

  renderedCallback() {
    if (this.isAwsSdkInitialized) {
      return;
    }
    Promise.all([loadScript(this, AWS_SDK)])
      .then(() => {
        //For demo, hard coded the Record Id. It can dynamically be passed the record id based upon use cases
        console.log("sdk Loaded");
      })
      .catch((error) => {
        console.error("error -> ", error);
      });
  }

  //Initializing AWS SDK
  initializeAwsSdk(confData) {
    try {
      let AWS = window.AWS;
      console.log("inside confData", confData);
      console.log("inside initializeAwsSdk", AWS);

      AWS.config.update({
        accessKeyId: confData.AWS_Access_Key__c, //Assigning access key id
        secretAccessKey: confData.AWS_Secret_Access_Key__c //Assigning secret access key
      });

      AWS.config.region = confData.S3_Region_Name__c; //Assigning region of S3 bucket

      this.s3 = new AWS.S3({
        apiVersion: "2006-03-01",
        params: {
          Bucket: confData.S3_Bucket_Name__c //Assigning S3 bucket name
        }
      });

      this.isAwsSdkInitialized = true;
    } catch (error) {
      console.log("error initializeAwsSdk ", error);
    }
  }

  //get the file name from user's selection
  handleSelectedFiles(event) {
    if (event.target.files.length > 0) {
      this.selectedFilesToUpload = event.target.files[0];
      this.isnull = false;
      this.fileName = event.target.files[0].name;
      this.fileSize = Math.floor(event.target.files[0].size / 1024);
      console.log("fileName ====> " + this.fileName);
    }
  }

  // eslint-disable-next-line no-use-before-define
  handleclick(event) {
    this.uploadToAWS()
      .then(() => {
        return createmedia({
          recordId: this.recordId,
          Url: this.fileURL,
          Name: this.selectedFilesToUpload.name,
          Size: this.fileSize
        });
      })
      .then((result) => {
        this.data = result;
        this.fetchingdata();
        this.selectedFilesToUpload = null;
        this.fileName = null;
        this.isnull = true;
        console.log(result);
      })

      .catch((error) => {
        console.error("Error:", error);
      });
  }

  async uploadToAWS() {
    try {
      this.initializeAwsSdk(this.confData);
      let file = this.selectedFilesToUpload;
      console.log("file ", file);

      if (this.selectedFilesToUpload) {
        let objKey = this.selectedFilesToUpload.name
          .replace(/\s+/g, "_")
          .toLowerCase();

        let params = {
          Key: objKey,
          ContentType: this.selectedFilesToUpload.type,
          Body: this.selectedFilesToUpload,
          ACL: "public-read"
        };

        // Use S3 upload method for progress tracking (no need for ManagedUpload constructor)
        let upload = this.s3.upload(params);
        this.isfileuploading = true;
        upload.on("httpUploadProgress", (progress) => {
          // Calculate and update the upload progress
          this.uploadProgress = Math.round(
            (progress.loaded / progress.total) * 100
          );
          console.log("Upload progress: ", this.uploadProgress);
        });

        console.log("Starting upload...");

        await upload.promise(); // Wait for the upload to complete

        console.log("Upload completed successfully!");

        let bucketName = this.confData.S3_Bucket_Name__c;
        this.fileURL = `https://${bucketName}.s3.amazonaws.com/${objKey}`;
        console.log("Success");
        this.isfileuploading = false;

        this.uploadProgress = 0;

        this.listS3Objects();
      }
    } catch (error) {
      console.error("Error in uploadToAWS: ", error);
    }
  }

  //listing all stored documents from S3 bucket
  listS3Objects() {
    try {
      this.s3.listObjects((err, data) => {
        if (err) {
          console.log("Error", err);
        } else {
          console.log("fileURL", this.fileURL);
          console.log("Success", data.Contents);
        }
      });
    } catch (error) {
      console.log("error ", error);
    }
  }
  allowDrop(event) {
    event.preventDefault();
    // console.log("allowDrop triggered");
  }

  showToast() {
    const event = new ShowToastEvent({
      title: "Error",
      message: "File type Incorrect",
      variant: "Error"
    });
    this.dispatchEvent(event);
  }

  handleDrop(event) {
    event.preventDefault();
    console.log("handleDrop triggered");
    const files = event.dataTransfer.files;
    console.log(files);
    console.log(files[0].type);
    // eslint-disable-next-line no-use-before-define
    if (
      files[0].type == "image/png" ||
      files[0].type == "image/jpg" ||
      files[0].type == "image/jpeg"
    ) {
      this.fileSize = Math.floor(files[0].size / 1024);
      this.selectedFilesToUpload = files[0];
      this.isnull = false;
      this.fileName = files[0].name;
    } else {
      this.showToast();
    }
  }
}
