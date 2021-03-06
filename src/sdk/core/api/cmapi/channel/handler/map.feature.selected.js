/* global cmapi */

// Register a channel handler for map.feature.selected
cmapi.channel.handler[cmapi.channel.names.MAP_FEATURE_SELECTED] = {
    // args will have a message and sender property
    process: function(args) {
        var featureTransaction,
            i,
            len,
            featureItems = [],
            message = args.message,
            sender = args.sender,
            payload,
            //schema,
            item;


        featureTransaction = new emp.typeLibrary.Transaction({
            intent: emp.intents.control.SELECTION_SET,
            mapInstanceId: args.mapInstanceId,
            transactionId: message.messageId,
            sender: sender.id,
            originChannel: cmapi.channel.names.MAP_FEATURE_SELECTED,
            source: emp.api.cmapi.SOURCE,
            originalMessage: args.originalMessage,
            messageOriginator: sender.id,
            originalMessageType: cmapi.channel.names.MAP_FEATURE_SELECTED,
            items: featureItems
        });

        // get schema for this channel
        // can use for channel specific validation
        //schema = cmapi.channel.schema[cmapi.channel.names.MAP_FEATURE_SELECTED];

        if (!Array.isArray(message.payload)) {
            message.payload = [message.payload];
        }

        len = message.payload.length;

        for (i = 0; i < len; i = i + 1) {
            payload = message.payload[i];
            item = {};

            if ((payload.overlayId === undefined) || (payload.overlayId === null))
            {
                payload.overlayId = sender.id;
            }

            item = new emp.typeLibrary.Selection({
                overlayId: payload.overlayId,
                featureId: payload.featureId,
                parentId: payload.parentId,
                selectedId: payload.selectedId,
                selectedName: payload.selectedName,
                select: true,
                transactionId: featureTransaction.transactionId
            });

            featureItems.push(item);
        }

        featureTransaction.queue();
    }
};
