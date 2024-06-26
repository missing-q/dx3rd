
export class DisableHooks {
    static init() {
        Hooks.on("afterRoll", async actor => {
            await this.disableTalents(actor, ['roll']);
        });

        Hooks.on("afterMajor", async actor => {
            await this.disableTalents(actor, ['roll', 'major']);
        });

        Hooks.on("afterReaction", async actor => {
            await this.disableTalents(actor, ['roll', 'reaction']);
        });

        Hooks.on("afterGuard", async actor => {
            await this.disableTalents(actor, ['guard']);
        });

        Hooks.on("afterTurn", async actor => {
            await this.disableTalents(actor, ['roll', 'major', 'reaction', 'turn']);
        });

        Hooks.on("onSetup", async actors => {
            for (let actor of actors){
                await this.disableTalents(actor, ['setup']);
            }
                
        });
        Hooks.on("onCleanup", async actors => {
            for (let actor of actors){
                await this.disableTalents(actor, ['cleanup']);
                await this.applyTaintDmg(actor)
            }
        });

        Hooks.on("afterUse", async actor => {
            await this.disableTalents(actor, ['use']);
        });

        Hooks.on("afterRound", async actors => {
            for (let actor of actors){
                await this.disableTalents(actor, ['roll','major', 'reaction', 'turn', 'round']);
                await this.clearDazed(actor)
            }
                
        });

        Hooks.on("afterCombat", async actors => {
            for (let actor of actors)
                await this.disableTalents(actor, ['roll','major', 'reaction', 'turn', 'round', 'battle']);
        });

        Hooks.on("afterSession", async () => {
            for (let actor of game.actors) {
                await this.disableTalents(actor, ['roll','major', 'reaction', 'turn', 'round', 'battle', 'session']);
            }
            ChatMessage.create({"content": `${game.i18n.localize("DX3rd.Goodbye")}`, "sound":CONFIG.sounds.notification})
        });

    }

    static async disableTalents(actor, active, used) {
        let actorupdates = {};
        for (let item of actor.items) {
            let updates = {};
            if (item.type == "effect"){
                if (item.system.active != (undefined)){
                    //evaluate HP modification at interval
                    if ((item.system.modHP.value != "") && (item.system.modHP.active) && (active.findIndex(i => i == item.system.modHP.timing) != -1)){
                        console.log("HP applied")
                        let num;
                        //add modifiers from applied, if any
                        if (item.system.applied){
                            num = await this.evalEffect(item, true, actor, true, true)
                        } else {
                            num = await this.evalEffect(item, true, actor, true, false)
                        }
                        actorupdates["system.attributes.hp.value"] = actor.system.attributes.hp.value + num
                    }
                    //evaluate encroach modification at interval
                    if ((item.system.modEncroach.value != "") && (item.system.modEncroach.active) && (active.findIndex(i => i == item.system.modEncroach.timing) != -1)){
                        console.log("encroach self")
                        let num;
                        if (item.system.applied){
                            num = await this.evalEffect(item, false, actor, true, true)
                        } else {
                            num = await this.evalEffect(item, false, actor, true, false)
                        }
                        actorupdates["system.attributes.encroachment.value"] = actor.system.attributes.encroachment.value + num
                    }
                    if (active.findIndex(i => i == item.system.active.disable) != -1){
                        updates["system.active.state"] = false;
                    }
                    if (active.findIndex(i => i == item.system.modHP.timing) != -1){
                        updates["system.modHP.active"] = false;
                    }
                    if (active.findIndex(i => i == item.system.modEncroach.timing) != -1){
                        updates["system.modEncroach.active"] = false;
                    }
                    //check for applied timing on ability
                    if (item.system.applied){
                        for (let [key, effect] of Object.entries(item.system.applied)) {
                            let disable = false;
                            for (let [k,v] of Object.entries(effect)){
                              if (v.key == "timing" && (active.findIndex(i => i == v.value) != -1 )){
                                disable = true;
                              }
                            }
                            console.log("disabling!")
                            if (disable){
                              updates[`system.applied.-=${key}`] = null;
                            }
                          }
                    }
                }
                if (item.system.uses.active){
                    if (active.findIndex(i => i == item.system.uses.formula_timing) != -1 ){
                        updates["system.uses.current"] = item.system.uses.max
                    }
                }
                item.update(updates);
            } else if (item.type == "weapon" || "protect"){
                if (active.findIndex(i => i == item.system.timing) != -1){
                    actor.deleteEmbeddedDocuments("Item", [item.id]);
                }
            }
        }
        //smiles
        //evaluate applied
        for (let [key, effect] of Object.entries(actor.system.attributes.applied)) {
            //apply HP effect
            if (active.findIndex(i => i == effect.modHP.timing) != -1){
                console.log("HP applied")
                let num = await this.evalEffect(effect, true, actor, false)
                actorupdates["system.attributes.hp.value"] = actor.system.attributes.hp.value + num
            }
            //apply encroach effect
            if (active.findIndex(i => i == effect.modEncroach.timing) != -1){
                console.log("encroach applied")
                let num = await this.evalEffect(effect, false, actor, false)
                actorupdates["system.attributes.encroachment.value"] = actor.system.attributes.encroachment.value + num
            }
            //negate applied
            if (active.findIndex(i => i == effect.disable) != -1){
                actorupdates[`system.attributes.applied.-=${key}`] = null;
            }
        }

        //console.log(actorupdates)
        actor.update(actorupdates);
    }
    static async evalEffect(effect, isHP, actor, self, applied){
        let num = 0
        var isRoll = false
        var rollData;
        try {
            if (isHP){
                if (self){
                    num = effect.system.modHP.value
                } else {
                    num = effect.modHP.value
                }
            } else {
                if (self){
                    num = effect.system.modEncroach.value
                } else {
                    num = effect.modEncroach.value
                }
            }
            if (num.indexOf('@level') != -1){
                let tmp;
                if (self){
                    tmp = effect
                } else {
                    tmp = game.actors.get(effect.actorId).items.get(effect.itemId)
                }
                console.log(tmp)
                if (tmp.system.level.value){
                    num = num.replace("@level", tmp.system.level.value);
                } else {
                    num = num.replace("@level", tmp.system.level.init);
                }
                
            }
            if (num.indexOf('@currhp') != -1){
                let tmp;
                if (self){
                    tmp = effect.actor
                } else {
                    tmp = game.actors.get(effect.actorId)
                }
                console.log(tmp)
                num = num.replace("@currhp", tmp.system.attributes.hp.value);
            }
            if (num.indexOf('@maxhp') != -1){
                let tmp;
                if (self){
                    tmp = effect.actor
                } else {
                    tmp = game.actors.get(effect.actorId)
                }
                console.log(tmp)
                num = num.replace("@maxhp", tmp.system.attributes.hp.max);
            }
            if (num.indexOf('@body') != -1){
                let tmp;
                if (self){
                    tmp = effect.actor
                } else {
                    tmp = game.actors.get(effect.actorId)
                }
                console.log(tmp)
                num = num.replace("@body", tmp.system.attributes.body.value);
            }
            if (num.indexOf('@mind') != -1){
                let tmp;
                if (self){
                    tmp = effect.actor
                } else {
                    tmp = game.actors.get(effect.actorId)
                }
                console.log(tmp)
                num = num.replace("@mind", tmp.system.attributes.mind.value);
            }
            if (num.indexOf('@sense') != -1){
                let tmp;
                if (self){
                    tmp = effect.actor
                } else {
                    tmp = game.actors.get(effect.actorId)
                }
                console.log(tmp)
                num = num.replace("@sense", tmp.system.attributes.sense.value);
            }
            if (num.indexOf('@social') != -1){
                let tmp;
                if (self){
                    tmp = effect.actor
                } else {
                    tmp = game.actors.get(effect.actorId)
                }
                console.log(tmp)
                num = num.replace("@social", tmp.system.attributes.social.value);
            }

            if (num.indexOf('#') != -1){
                var indices = [];
                for(var i=0; i<num.length;i++) {
                  if (num[i] === "#") indices.push(i);
                }
                //get indices in string
                if (indices.length == 3){
                  let front = indices[0]
                  let mid = indices[1]
                  let back = indices[2]
                  let str = num.substring(front, back + 1)
                  let id = num.substring(front + 1, mid)
                  let prop = num.substring(mid + 1, back)
                  
                  console.log(id)
                  console.log(prop)
                  let item = game.items.get(id)
                  if (!item){ //check to see if it exists on other char sheets
                    for (let a of game.actors.contents){
                      if (a.items.get(id)){
                        item = a.items.get(id)
                        break;
                      }
                    }
                  }
                  let tmp = item
                  //dynamic indices access
                  while (prop.indexOf('.') != -1){
                    console.log(tmp)
                    console.log(prop)
                    tmp = tmp[prop.slice(0,prop.indexOf('.'))]
                    prop = prop.slice(prop.indexOf('.') + 1)
                  }
                  num = num.replace(str, tmp[prop])
                  console.log(num)
                }
            }
            let chatData = { "speaker": ChatMessage.getSpeaker({ actor: actor }), "sound":CONFIG.sounds.notification};
            if (num.indexOf('D') != -1){
                
                let front = num.substring(0,num.indexOf('D'))
                let back = num.substring(num.indexOf('D')+1)
                front += "d10" + back
                let roll = new Roll(front);
                await roll.roll({async: true});
                num = roll.total
                isRoll = true
                rollData = await roll.render();
                chatData.type = CONST.CHAT_MESSAGE_TYPES.ROLL;
                chatData.sound = CONFIG.sounds.dice;
                chatData.roll = roll;
            }
            num = math.evaluate(num)
            //applied evaluation
            if (applied){
                let min;
                let max;
                let val = 0;
                if (isHP){
                    for (let [k,v] of Object.entries(effect.system.applied)){
                        for (let [key, value] of Object.entries(v)){
                            let curr = value.value
                            if (value.key == "modhp"){
                                val += curr
                            } else if (value.key == "modhp_max"){ //greatest max
                                if (max){
                                    if (max < curr) max = curr
                                } else {
                                    max = Number.parseInt(curr)
                                }
                            }  else if (value.key == "modhp_min"){ //least min
                                if (min){
                                    if (min > curr) min = curr
                                } else {
                                    min = curr
                                }
                            }
                        }
                    }
                } else {
                    for (let [k,v] of Object.entries(item.system.applied)){
                        for (let [key, value] of Object.entries(v)){
                            if (value.key == "modenc"){
                                val += value.value 
                            } else if (value.key == "modenc_max"){ //greatest max
                                if (max){
                                    if (max < value.value) max = value.value
                                } else {
                                    max = Number.parseInt(value.value)
                                }
                            }  else if (value.key == "modenc_min"){ //least min
                                if (min){
                                    if (min > value.value) min = value.value
                                } else {
                                    min = value.value
                                }
                            }
                        }
                    }
                }
                num += val;
                if (max){
                    if (num > max){
                        num = max;
                    }
                }
                if (min){
                    if (num < min){
                        num = min;
                    }
                }
            }
            console.log(num)
            
            if (isHP){
                console.log(rollData)
                console.log(chatData)
                if (isRoll){
                    chatData.content = `
                        <div class="dx3rd-roll" data-actor-id=${actor.id}>
                        <h2 class="header"><div class="title">${actor.name}(${num})</div></h2>
                        ${rollData}
                        </div>
                    `;
                } else {
                    chatData.content = `<div class="context-box">${actor.name}(${num})</div>`
                }
                
            } else {
                if (isRoll){
                    chatData.content = `
                        <div class="dx3rd-roll" data-actor-id=${actor.id}>
                        <h2 class="header"><div class="title">${actor.name}: ${actor.system.attributes.encroachment.value} -> ${actor.system.attributes.encroachment.value + num} (+${num})</div></h2>
                        ${rollData}
                        </div>
                    `;
                } else {
                    chatData.content = `<div class="context-box">${actor.name}: ${actor.system.attributes.encroachment.value} -> ${actor.system.attributes.encroachment.value + num} (+${num})</div>`
                }
            }
            ChatMessage.create(chatData);
        } catch (error) {
            console.log(error)
            console.error("Values other than formula, @level, D dice are not allowed.");
            num = 0
        }
        if (isNaN(num)){
            num = 0
        }
        return num;
    }
    static getStatus(actor, str){
        for (let i = 0; i < actor.appliedEffects.length; i++){
            if (actor.appliedEffects[i].statuses.has(str)){
                return actor.appliedEffects[i];
            }
        }
    }
    static async applyTaintDmg(actor){
        //get AE from actor
        let taint = this.getStatus(actor, "taint")
        if (taint){//if actor has taint status
            //calculate damage
            let dmg = (taint.getFlag("dx3rd", "taintLevel") || 1) * -3
            actor.update({"system.attributes.hp.value": actor.system.attributes.hp.value + dmg})
            let chatData = { "speaker": ChatMessage.getSpeaker({ actor: actor }), "sound":CONFIG.sounds.notification, "content": `<h2 class="header"><div class="title"> ${game.i18n.localize("DX3rd.Taint")} </div> </h2> <div class="context-box">${actor.name}(${dmg})</div>`};
            ChatMessage.create(chatData)
        }

    }

    static async clearDazed(actor){
        let dazed = this.getStatus(actor, "dazed")
        if (dazed){
            dazed.delete()
        }
    }
}
