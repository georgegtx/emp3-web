/**
 * Controls the process of editing Features on the map.  Will
 * start the process to make sure all the messages are published
 * to the map.
 */
emp.editingManager = function(args) {

  var editTransaction, // The original edit transaction.
    mapInstance = args.mapInstance, // The map the edit is occurring on
    feature, // the current state of the feature.
    activeEditor, // The editor chosen based on the format and or draw type.
    updateData, // The most recent change to the feature, includes metadata about the vertex move/removal and updates.
    originalFeature;
  var publicInterface = {

    /**
     * Called when the map goes into edit mode.
     */
    edit: function(transaction) {
      var symbol = false,
        standard,
        symbolCode,
        basicCode,
        symbolDef,
        unitDef,
        drawCategory;

      //pause the transaction
      transaction.pause();

      editTransaction = transaction;

      //publish the start event
      mapInstance.eventing.EditStart({
        transaction: editTransaction,
        featureId: editTransaction.items[0].featureId,
        overlayId: editTransaction.items[0].overlayId,
        parentId: editTransaction.items[0].parentId
      });

      editTransaction.items[0].update({
        name: editTransaction.items[0].name,
        updates: {},
        properties: editTransaction.items[0].properties,
        updateEventType: emp.typeLibrary.UpdateEventType.START,
        mapInstanceId: mapInstance.mapInstanceId
      });

      // Determine the type of editor to create.
      feature = emp.storage.get.id({
        id: editTransaction.items[0].originFeature.coreId
      });
      //feature = emp.storage.findFeature(null, editTransaction.items[0].featureId);

      // copy the feature.  we do not want to modify the original feature in
      // the transaction.  This feature will track the current state.
      if (feature) {
        feature = feature.getObjectData(mapInstance.mapInstanceId, emp.storage.getRootGuid(mapInstance.mapInstanceId));
        feature = emp.helpers.copyObject(feature);
        // The feature prior to any changes occurring.
        originalFeature = emp.helpers.copyObject(feature);
      }

      // Determine if this is a MIL Symbol.  The mil symbol categories can greatly
      // vary, so we need to know the symbol code and standard for this.
      if (feature.format === emp3.api.enums.FeatureTypeEnum.GEO_MIL_SYMBOL) {
        symbol = true;

        // get the symbolCode of the MIL Std feature
        symbolCode = feature.data.symbolCode;

        // Get which standard the symbol is using, by default it is MIL-STD-2525C.
        if (feature.properties && feature.properties.modifiers) {
          standard = feature.properties.modifiers.standard || 1;
        }

        basicCode = armyc2.c2sd.renderer.utilities.SymbolUtilities.getBasicSymbolID(symbolCode, standard);

        // Determine the draw category.  We do this using our renderer's utility
        // methods.  The draw category tells us what type of editor to use.
        if (armyc2.c2sd.renderer.utilities.SymbolDefTable.hasSymbolDef(basicCode, standard)) {
          symbolDef = armyc2.c2sd.renderer.utilities.SymbolDefTable.getSymbolDef(basicCode, standard);
          if (symbolDef) {
            drawCategory = symbolDef.drawCategory;
          }
        }
        else {
          unitDef = armyc2.c2sd.renderer.utilities.UnitDefTable.getUnitDef(basicCode, standard);
          if (unitDef) {
            drawCategory = unitDef.drawCategory;
          }
        }
      }

      // Determine the type of editor needed.
      if (feature.format === emp3.api.enums.FeatureTypeEnum.GEO_POINT ||
        (symbol && drawCategory === armyc2.c2sd.renderer.utilities.SymbolDefTable.DRAW_CATEGORY_POINT)) {
        // create the editor for the appropriate item being edited.
        activeEditor = new emp.editors.Point({
          feature: feature,
          mapInstance: args.mapInstance
        });
      }
      else {
        // create the editor for the appropriate item being edited.
        activeEditor = new emp.editors.EditorBase({
          feature: feature,
          mapInstance: args.mapInstance
        });
      }

      // have the editor create any editing features on the map.
      activeEditor.addControlPoints();

    },

    /**
     * Called when edit is cancelled.  Editing vertex are removed from
     * map, and feature returns to original state.
     */
    cancel: function() {

      var initFailList = [],
      transaction;

      initFailList.push(new emp.typeLibrary.Error({
        coreId: editTransaction.items[0].coreId,
        message: "The editing was cancelled.",
        level: emp.typeLibrary.Error.level.INFO
      }));

      editTransaction.items[0].originFeature = originalFeature;
      mapInstance.eventing.EditEnd({
        transaction: editTransaction,
        failures: initFailList
      });

      // remove editing control points from the map.
      activeEditor.removeControlPoints();


      // restore the feature to its original state.  Create
      // a FEATURE_ADD transaction that updates the feature
      // to its original state.
      transaction = new emp.typeLibrary.Transaction({
        intent: emp.intents.control.FEATURE_ADD,
        mapInstanceId: mapInstance.mapInstanceId,
        transactionId: null,
        sender: mapInstance.mapInstanceId,
        originChannel: cmapi.channel.names.MAP_FEATURE_PLOT,
        source: emp.api.cmapi.SOURCE,
        messageOriginator: mapInstance.mapInstanceId,
        originalMessageType: cmapi.channel.names.MAP_FEATURE_PLOT,
        items: [originalFeature]
      });

      // undo any changes that were made during the edit.
      transaction.run();

      // finish running the edit transaction
      editTransaction.run();

      // We are done editing. Reset state of editingManager.
      editTransaction = undefined;
      feature = undefined;
      activeEditor = undefined;
      updateData = undefined;
      originalFeature = undefined;
    },

    complete: function() {

      //publish the drawing end event
      var item,
        transaction;

      editTransaction.items[0].updatedFeature = activeEditor.featureCopy;

      mapInstance.eventing.EditEnd({
        transaction: editTransaction
      });

      // remove editing control points from the map.
      activeEditor.removeControlPoints();

      // update the feature to its new state. Create
      // a FEATURE_ADD transaction that updates the feature
      // to its new state.  We pull that state from the editor.
      item = activeEditor.featureCopy;

      transaction = new emp.typeLibrary.Transaction({
        intent: emp.intents.control.FEATURE_ADD,
        mapInstanceId: mapInstance.mapInstanceId,
        transactionId: null,
        sender: mapInstance.mapInstanceId,
        originChannel: cmapi.channel.names.MAP_FEATURE_PLOT,
        source: emp.api.cmapi.SOURCE,
        messageOriginator: mapInstance.mapInstanceId,
        originalMessageType: cmapi.channel.names.MAP_FEATURE_PLOT,
        items: [item]
      });

      // Send out the message that will trigger the complete callback.
      editTransaction.items[0].update({
        name: feature.name,
        updates: updateData.coordinateUpdate,
        properties: updateData.properties,
        updateEventType: emp.typeLibrary.UpdateEventType.COMPLETE,
        mapInstanceId: mapInstance.mapInstanceId
      });


      // Immediately update the feature to the new state.
      transaction.run();

      // finish running the transaction
      editTransaction.run();

      // We are done editing. Reset state of editingManager.
      editTransaction = undefined;
      feature = undefined;
      activeEditor = undefined;
      updateData = undefined;
      originalFeature = undefined;
    },

    editMouseDown: function(featureId) {

      var mapLock,
        lockMapTransaction;

      // only raise the event if the item we are trying to drag is
      // the item that is being edited.
      if (originalFeature && featureId === originalFeature.featureId) {

        mapLock = new emp.typeLibrary.Lock({
          lock: true
        });

        // first lock the map in place so the map does not pan.

        lockMapTransaction = new emp.typeLibrary.Transaction({
          intent: emp.intents.control.VIEW_LOCK,
          mapInstanceId: mapInstance.mapInstanceId,
          source: mapInstance.mapInstanceId,
          messageOriginator: mapInstance.mapInstanceId,
          originalMessageType: cmapi.channel.names.MAP_VIEW_LOCK,
          items: [mapLock]
        });

        lockMapTransaction.run();
      }

    },

    editDragStart: function(featureId, pointer) {

      var transaction;
      var lockMapTransaction;
      var mapLock;

      // only raise the event if the item we are trying to drag is
      // the item that is being edited.
      if (originalFeature && featureId === originalFeature.featureId) {

        // If we are dragging a control point, we don't want
        // any events going out, because it is not a feature.
        if (activeEditor.isControlPoint(featureId)) {
          activeEditor.moveControlPoint(featureId, pointer);
        }
        else if (activeEditor.isFeature(featureId)) {
          // If this is the feature we are editing, raise a feature drag
          // event.

          // create a feature drag event.
          transaction = new emp.typeLibrary.Transaction({
            mapInstanceId: mapInstance.mapInstanceId,
            intent: emp.intents.control.POINTER,
            originChannel: "cmapi2.map.view.drag",
            source: emp.core.sources.MAP,
            transactionId: emp.helpers.id.newGUID(),
            items: [pointer]
          });

          // send out the event.
          transaction.run();
        }
      }
      else {
        mapLock = new emp.typeLibrary.Lock({
          lock: false
        });

        // first lock the map in place so the map does not pan.

        lockMapTransaction = new emp.typeLibrary.Transaction({
          intent: emp.intents.control.VIEW_LOCK,
          mapInstanceId: mapInstance.mapInstanceId,
          source: mapInstance.mapInstanceId,
          messageOriginator: mapInstance.mapInstanceId,
          originalMessageType: cmapi.channel.names.MAP_VIEW_LOCK,
          items: [mapLock]
        });

        lockMapTransaction.run();
      }
    },

    editDragMove: function(featureId, startX, startY, pointer) {

      if (originalFeature && featureId === originalFeature.featureId) {

        if (activeEditor.isControlPoint(featureId)) {
          updateData = activeEditor.moveControlPoint(featureId, pointer);
        }
        else if (activeEditor.isFeature(featureId)) {
          updateData = activeEditor.moveFeature(startX, startY, pointer);
        }

        editTransaction.items[0].update({
          name: feature.name,
          updates: updateData.coordinateUpdate,
          properties: updateData.properties,
          updateEventType: emp.typeLibrary.UpdateEventType.UPDATE,
          mapInstanceId: mapInstance.mapInstanceId
        });
      }
    },

    editDragComplete: function(featureId, startX, startY, pointer) {
      var transaction;
      var lockMapTransaction;
      var mapLock;

      if (originalFeature && featureId === originalFeature.featureId) {
        if (activeEditor.isControlPoint(featureId)) {
          updateData = activeEditor.moveControlPoint(featureId, pointer);
        }
        else if (activeEditor.isFeature(featureId)) {
          updateData = activeEditor.moveFeature(startX, startY, pointer);

          // send out a feature drag complete event.
          transaction = new emp.typeLibrary.Transaction({
            mapInstanceId: mapInstance.mapInstanceId,
            intent: emp.intents.control.POINTER,
            originChannel: "cmapi2.map.view.dragComplete",
            source: emp.core.sources.MAP,
            transactionId: emp.helpers.id.newGUID(),
            items: [pointer]
          });
          transaction.run();
        }

        editTransaction.items[0].update({
          name: feature.name,
          updates: updateData.coordinateUpdate,
          properties: updateData.properties,
          updateEventType: emp.typeLibrary.UpdateEventType.UPDATE,
          mapInstanceId: mapInstance.mapInstanceId
        });

        mapLock = new emp.typeLibrary.Lock({
          lock: false
        });

        lockMapTransaction = new emp.typeLibrary.Transaction({
          intent: emp.intents.control.VIEW_LOCK,
          mapInstanceId: mapInstance.mapInstanceId,
          source: mapInstance.mapInstanceId,
          messageOriginator: mapInstance.mapInstanceId,
          originalMessageType: cmapi.channel.names.MAP_VIEW_LOCK,
          items: [mapLock]
        });

        lockMapTransaction.run();
      }
    }
  };
  return publicInterface;

};