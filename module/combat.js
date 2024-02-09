
export class DX3rdCombat extends Combat {
  
    /** @inheritdoc */
    async _onCreate(data, options, userId) {
      super._onCreate(data, options, userId);
      if (game.user.id != userId)
        return;
        
      let startActor = null, startLabel = "[ Setup ]";
      let endActor = null, endLabel = "[ Cleanup ]"
      
      let startToken = null
      let endToken = null
      
      for (let a of game.actors) {
        if (a.name == startLabel)
          startActor = a;
        else if (a.name == endLabel)
          endActor = a;
      }
    
      if (startActor == null)
        startActor = await Actor.create({name: startLabel, type: "character", img: "icons/pings/chevron.webp"});
      if (endActor == null)
        endActor = await Actor.create({name: endLabel, type: "character", img: "icons/pings/chevron.webp"});
  
  
      for (let a of this.scene.tokens) {
        if (a.name == startLabel)
          startToken = a;
        else if (a.name == endLabel)
          endToken = a;
      }
      
      if (startToken == null)
        startToken = (await this.scene.createEmbeddedDocuments("Token", [{alpha: 0, actorId: startActor.id}], {}))[0];
      if (endToken == null)
        endToken = (await this.scene.createEmbeddedDocuments("Token", [{alpha: 0, actorId: endActor.id}], {}))[0];


      await this.setFlag("dx3rd", "startToken", startToken.uuid);
      await this.setFlag("dx3rd", "endToken", endToken.uuid);
      await this.setFlag("dx3rd", "startActor", startActor.id)
      await this.setFlag("dx3rd", "endActor", endActor.id)
  
      await this.createEmbeddedDocuments("Combatant", [{actorId: startActor.id, tokenId: startToken.id, name: startLabel, img: startActor.img, initiative: 99}, {actorId: endActor.id, tokenId: endToken.id, name: endLabel, img: startActor.img, initiative: -99}], {});
      
      if ( !this.collection.viewed ) ui.combat.initialize({combat: this});
    }
      
    /** @Override */
    async rollInitiative(ids, {formula=null, updateTurn=true, messageOptions={}}={}) {
      let startTokenUUID = this.flags["dx3rd"].startToken;
      let endTokenUUID = this.flags["dx3rd"].endToken;

      let startToken = await fromUuid(startTokenUUID);
      let endToken = await fromUuid(endTokenUUID);

  
      // Structure input data
      ids = typeof ids === "string" ? [ids] : ids;
      const currentId = this.combatant?.id;
      const rollMode = messageOptions.rollMode || game.settings.get("core", "rollMode");
  
      // Iterate over Combatants, performing an initiative roll for each
      const updates = [];
      const messages = [];
      for ( let [i, id] of ids.entries() ) {

        // Get Combatant data (non-strictly)
        const combatant = this.combatants.get(id);
        if ( !combatant?.isOwner ) return results;

        // Produce an initiative roll for the Combatant
        const roll = combatant.getInitiativeRoll(formula);
        await roll.evaluate({async: true});

        let init = roll.total;
        if (combatant.tokenId == startToken.id)
          init = 99
        else if (combatant.tokenId == endToken.id)
          init = -99
 
        updates.push({_id: id, initiative: init});
      }
      if ( !updates.length ) return this;
  
      // Update multiple combatants
      await this.updateEmbeddedDocuments("Combatant", updates);
  
      // Ensure the turn order remains with the same combatant
      if ( updateTurn && currentId ) {
        await this.update({turn: this.turns.findIndex(t => t.id === currentId)});
      }
  
      // Create multiple chat messages
      await ChatMessage.implementation.create(messages);
      return this;
    }

    _sortCombatants(a, b) {
      const ia = Number.isNumeric(a.initiative) ? a.initiative : -9999;
      const ib = Number.isNumeric(b.initiative) ? b.initiative : -9999;
      let ci = ib - ia;
      if ( ci !== 0 ) return ci;

      if (a.isNPC !== b.isNPC) {
        if (a.isNPC)
          return 1;
        else
          return -1;
      }

      let cn = a.name.localeCompare(b.name);   
      if ( cn !== 0 ) return cn;
      return a.id - b.id;
    }
  
    /* -------------------------------------------- */	
    
     /** @Override */
    async _onDelete(options, userId) {
      let startTokenUUID = this.flags["dx3rd"].startToken;
      let endTokenUUID = this.flags["dx3rd"].endToken;

      super._onDelete(options, userId);
      
      let startToken = await fromUuid(startTokenUUID);
      let endToken = await fromUuid(endTokenUUID);

      await startToken.delete();
      await endToken.delete();
    }
  
      
  }
  