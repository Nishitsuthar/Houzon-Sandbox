public with sharing class uploadController {
  public uploadController() {
  }

  @AuraEnabled
  public static list<PropertyMedia__c> fetchdata(String recordId) {
    List<PropertyMedia__c> result = [
      SELECT Id, FilenameUrlEncoded__c, Name, Size__c, Property_hz__c
      FROM PropertyMedia__c
      WHERE Property_hz__c = :recordId
    ];
    return result;
  }

  @AuraEnabled
  public static Boolean createmedia(
    String Name,
    Decimal Size,
    String recordId,
    String Url
  ) {
    PropertyMedia__c Media = new PropertyMedia__c();
    Media.FilenameUrlEncoded__c = Url;
    Media.Name = Name;
    Media.Size__c = Size;
    Media.Property_hz__c = recordId;
    insert Media;
    return true;
  }

  @AuraEnabled
  public static Boolean deletemedia(String id) {
    List<PropertyMedia__c> result = [
      SELECT Id, FilenameUrlEncoded__c, Name, Size__c, Property_hz__c
      FROM PropertyMedia__c
      WHERE Id = :id
      LIMIT 1
    ];
    delete result;
    return true;
  }
}
