cmapi.channel.schema["map.overlay.show"] = {
  "$schema":"http://json-schema.org/draft-04/schema#",
  "title":"map.overlay.show",
  "description":"Show existing overlay on the map.",
  "properties":{
    "overlayId":{
      "description":"The ID of the overlay to be shown. If no overlayId is included, default overlay with ID equal to sending widget’s ID is assumed.",
      "type":"string",
      "default":"sending widget's ID"
    },
    "messageId":{
      "description":"A globally unique ID that identifies this particular message. If the messageId property is populated, maps that support the user manipulation extension MUST use this messageId in the map.message.complete, map.message.progress, and map.message.cancel messages as defined in the User Manipulation extension to indicate progress and either completion or cancellation (as appropriate) of this message request.",
      "type":"string",
      "status":"new",
      "extension":"User Manipulation - Message Complete"
    }    
  },
  "required":[
    
  ]  
};
