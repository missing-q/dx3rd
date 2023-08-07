
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

        Hooks.on("afterTurn", async actor => {
            await this.disableTalents(actor, ['roll', 'major', 'reaction', 'turn']);
        });

        Hooks.on("afterUse", async actor => {
            await this.disableTalents(actor, ['use']);
        });

        Hooks.on("afterRound", async actors => {
            for (let actor of actors)
                await this.disableTalents(actor, ['roll','major', 'reaction', 'turn', 'round']);
        });

        Hooks.on("afterCombat", async actors => {
            for (let actor of actors)
                await this.disableTalents(actor, ['roll','major', 'reaction', 'turn', 'round', 'battle']);
        });

        Hooks.on("afterSession", async () => {
            for (let actor of game.actors) {
                await this.disableTalents(actor, ['roll','major', 'reaction', 'turn', 'round', 'battle']);
            }
        });

    }

    static async disableTalents(actor, active, used) {
        let actorupdates = {};
        for (let item of actor.items) {
            let updates = {};
            if (item.system.active != (undefined)){
                //evaluate HP modification at interval
                if ((item.system.modHP.value != "") && (item.system.modHP.active) && (active.findIndex(i => i == item.system.modHP.timing) != -1)){
                    console.log("HP applied")
                    let num = await this.evalEffect(item, true, actor, true)
                    actorupdates["system.attributes.hp.value"] = actor.system.attributes.hp.value + num
                }
                //evaluate encroach modification at interval
                if ((item.system.modEncroach.value != "") && (item.system.modEncroach.active) && (active.findIndex(i => i == item.system.modEncroach.timing) != -1)){
                    console.log("encroach self")
                    let num = await this.evalEffect(item, false, actor, true)
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
            }
            
            item.update(updates);
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
        console.log(actorupdates)
        actor.update(actorupdates);
    }
    static async evalEffect(effect, isHP, actor, self){
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
            let chatData = { "speaker": ChatMessage.getSpeaker({ actor: actor })};
            if (num.indexOf('D') != -1){
                
                let front = num.substring(0,num.indexOf('D'))
                let back = num.substring(num.indexOf('D')+1)
                front += "d10"
                let roll = new Roll(front);
                await roll.roll({async: true});
                num = roll.total + back
                isRoll = true
                rollData = await roll.render();
                chatData.type = CONST.CHAT_MESSAGE_TYPES.ROLL;
                chatData.sound = CONFIG.sounds.notify;
                chatData.roll = roll;
            }
            num = math.evaluate(num)
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
}
