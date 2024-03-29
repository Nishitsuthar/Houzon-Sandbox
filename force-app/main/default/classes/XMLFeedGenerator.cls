public class XMLFeedGenerator {
    public String recordID;
    public String xmlstring { get; set; }

    public XMLFeedGenerator() {
        
        if(!Test.isRunningTest()){
        	recordID = ApexPages.currentPage().getParameters().get('Id').escapeHtml4();
        }
        Set<Id> ListingIds = new Set<Id>();
        
        List<PortalListing__c> PortalListings;

        if(!Test.isRunningTest()){
            PortalListings = [Select Id, Listing_hz__c, Portal__c, Portal__r.LastModifiedDate from PortalListing__c Where Portal__c =: recordID AND SystemIsActive__c = True];
        }
        else {
            PortalListings = [Select Id, Listing_hz__c, Portal__c, Portal__r.LastModifiedDate from PortalListing__c LIMIT 10];
        }
        
        //List<PortalListing__c> PortalListings = [Select Id, Listing_hz__c, Portal__c, Portal__r.LastModifiedDate from PortalListing__c Where Portal__c =: recordID AND SystemIsActive__c = True];
        for (PortalListing__c PortalList : PortalListings) {
            if (PortalList.Listing_hz__c != null) {
                ListingIds.add(PortalList.Listing_hz__c);
            }
        }
        List<String> fieldNames = getFieldNamesFromFieldSet('Listing_hz__c', 'FieldsForBayut');
        System.debug('Field Names: ' + fieldNames);
        String query = generateDynamicQuery(fieldNames, ListingIds);

        List<SObject> records = Database.query(query);

        Set<Id> PropertyIds = new Set<Id>();
        for (SObject record : records) {
            Id propertyId = (Id)record.get('Property_hz__c');
            if (propertyId != null) {
                PropertyIds.add(propertyId);
            }
        }

        // Map to store PropertyMedia__c records related to each Property_hz__c
        Map<Id, List<PropertyMedia__c>> propertyMediaUrlsMap = new Map<Id, List<PropertyMedia__c>>();
        for (PropertyMedia__c media : [SELECT FilenameUrlEncoded__c, Property_hz__c, LastModifiedDate FROM PropertyMedia__c WHERE Property_hz__c IN :PropertyIds]) {
            if (!propertyMediaUrlsMap.containsKey(media.Property_hz__c)) {
                propertyMediaUrlsMap.put(media.Property_hz__c, new List<PropertyMedia__c>());
            }
            propertyMediaUrlsMap.get(media.Property_hz__c).add(media);
        }

        DOM.Document doc = new DOM.Document();
        dom.XmlNode rootNode = doc.createRootElement('Properties', null, null);

        for (SObject record : records) {

            boolean hasFeatureValues = false;
            for (String fieldName : fieldNames) {
                if (fieldName.startsWith('Feature_')) {
                    Object fieldValue = record.get(fieldName);
                    if (fieldValue != null) {
                        hasFeatureValues = true;
                        break;
                    }
                }
            }

            dom.XmlNode propertyNode = rootNode.addChildElement('Property', null, null);
            
            for (String fieldName : fieldNames) {
                if(fieldName != 'Feature_1__c' && 
                   fieldName != 'Feature_2__c' && 
                   fieldName != 'Feature_3__c' && 
                   fieldName != 'Feature_4__c' && 
                   fieldName != 'Feature_5__c' && 
                   fieldName != 'Feature_6__c'){
                    Object fieldValue = record.get(fieldName);
    
                    if (fieldValue != null) {
                        dom.XmlNode fieldNode = propertyNode.addChildElement(fieldName, null, null);
                        fieldNode.addTextNode(String.valueOf(fieldValue));
                    }
                }
            }

            if (hasFeatureValues) {
                dom.XmlNode feature = propertyNode.addChildElement('Features', null, null);
                
                for (String fieldName : fieldNames) {
                    if(fieldName == 'Feature_1__c' || 
                    fieldName == 'Feature_2__c' || 
                    fieldName == 'Feature_3__c' || 
                    fieldName == 'Feature_4__c' || 
                    fieldName == 'Feature_5__c' || 
                    fieldName == 'Feature_6__c'){
                        Object fieldValue = record.get(fieldName);
        
                        // Check for null before adding text node
                        if (fieldValue != null) {
                            dom.XmlNode fieldNode = feature.addChildElement(fieldName, null, null);
                            fieldNode.addTextNode(String.valueOf(fieldValue));
                        }
                    }
                }
            }

            String lastModifiedDate = '';
            if (record.get('LastModifiedDate') != null) {
                Datetime lastModifiedDatetime = (Datetime)record.get('LastModifiedDate');
                lastModifiedDate = lastModifiedDatetime.format('yyyy-MM-dd HH:mm:ss');
            }
            
            dom.XmlNode lastupdate = propertyNode.addChildElement('Last_Updated', null, null);
            lastupdate.addTextNode(lastModifiedDate);

            if (propertyMediaUrlsMap.containsKey((Id)record.get('Property_hz__c'))) {
                dom.XmlNode ImageNode = propertyNode.addChildElement('Images', null, null);
                for (PropertyMedia__c media : propertyMediaUrlsMap.get((Id)record.get('Property_hz__c'))) {
                    dom.XmlNode fieldNodeImage = ImageNode.addChildElement('Image', null, null);
                    fieldNodeImage.addTextNode(media.FilenameUrlEncoded__c);
                }
            }
            
            dom.XmlNode Portal = propertyNode.addChildElement('Portals', null, null);
            dom.XmlNode PortalValue1 = Portal.addChildElement('Portal', null, null);
            PortalValue1.addTextNode('Bayut');
            dom.XmlNode PortalValue2 = Portal.addChildElement('Portal', null, null);
            PortalValue2.addTextNode('Dubizzle');
            
        }

        xmlstring = escapeXml(doc.toXmlString());
        System.debug('xmlstring-->' + xmlstring);
    }

    public List<String> getFieldNamesFromFieldSet(String objectApiName, String fieldSetName) {
        List<String> fieldNames = new List<String>();

        try {
            // Retrieve the SObjectType for the given object API name
            Schema.SObjectType objectType = Schema.getGlobalDescribe().get(objectApiName);
            if (objectType != null) {
                // Get the fieldset map for the given object type
                Map<String, Schema.FieldSet> fieldSetMap = objectType.getDescribe().fieldSets.getMap();

                // Check if the fieldset with the given name exists
                if (fieldSetMap.containsKey(fieldSetName)) {
                    // Get the fields from the fieldset
                    List<Schema.FieldSetMember> fieldSetMembers = fieldSetMap.get(fieldSetName).getFields();

                    // Extract field names and add them to the list
                    for (Schema.FieldSetMember fieldSetMember : fieldSetMembers) {
                        fieldNames.add(fieldSetMember.getFieldPath());
                    }
                }
            }
        } catch (Exception e) {
            // Handle exceptions as needed
            System.debug('Exception: ' + e.getMessage());
        }

        return fieldNames;
    }

    public String generateDynamicQuery(List<String> fieldNames, Set<Id> ListingIds) {
        String query = 'SELECT Id, Property_hz__c, LastModifiedDate';

        for (String fieldName : fieldNames) {
            query += ', ' + fieldName;
        }

        query += ' FROM Listing_hz__c WHERE Id IN :ListingIds';

        return query;
    }
    
    // Function to escape special characters
    private String escapeXml(String input) {
        input = input.replace('Broker_s_Listing_ID__c', 'Property_Ref_No');
        input = input.replace('ListingType__c', 'Property_purpose');
        input = input.replace('PropertyType__c', 'Property_Type');
        input = input.replace('City_for_Bayut__c', 'City');
        input = input.replace('Locality_for_Bayut__c', 'Locality');
        input = input.replace('Sub_Locality_for_Bayut__c', 'Sub_Locality');
        input = input.replace('Tower_name_for_bayut__c', 'Tower_name');
        input = input.replace('Name', 'Property_Title');
        input = input.replace('Title_Arabic__c', 'Property_Title_AR');
        input = input.replace('Description_hz__c', 'Property_Description');
        input = input.replace('Description_Arabic__c', 'Property_Description_AR');
        input = input.replace('TotalArea_hz__c', 'Property_Size');
        input = input.replace('Bedrooms_hz__c', 'Bedrooms');
        input = input.replace('FullBathrooms_hz__c', 'Bathroom');
        input = input.replace('ListingPrice_hz__c', 'Price');
        input = input.replace('Listing_Agent_Full_Property_Title__c', 'Listing_Agent');
        input = input.replace('Listing_Agent_Phone__c', 'Listing_Agent_Phone');
        input = input.replace('Listing_Agent_Email__c', 'Listing_Agent_Email');
        input = input.replace('Feature_1__c', 'Feature');
        input = input.replace('Feature_2__c', 'Feature');
        input = input.replace('Feature_3__c', 'Feature');
        input = input.replace('Feature_4__c', 'Feature');
        input = input.replace('Feature_5__c', 'Feature');
        input = input.replace('Feature_6__c', 'Feature');
        input = input.replace('RERA_Permit_Number__c', 'Permit_Number');
        input = input.replace('Off_plan__c', 'Off_Plan');
        input = input.replace('Rent_Frequency__c', 'Rent_Frequency');
        input = input.replace('Furnished__c', 'Furnished');
        return input;
    }
}