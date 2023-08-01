
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
        console.log(actor)
        let actorupdates = {};
        for (let item of actor.items) {
            let updates = {};
            if (item.system.active != (undefined)){
                //evaluate HP modification at interval
                if ((item.system.modHP.value != "") && (item.system.active.state) && (active.findIndex(i => i == item.system.modHP.timing) != -1)){
                    console.log("hello!! we're in here!!")
                    let num = 0;
                    try {
                        num = item.system.modHP.value
                        if (num.indexOf('@level') != -1){
                            num = num.replace("@level", item.system.level.init);
                        }
                        if (num.indexOf('D') != -1){
                            
                            let front = num.substring(0,num.indexOf('D'))
                            let back = num.substring(num.indexOf('D')+1)
                            front += "d10"
                            let roll = new Roll(front);
                            await roll.evaluate({async: true});
                            num = roll.total + back
                        }
                        num = math.evaluate(num)
                        let chatData = {"content": actor.name + " (" + num + ")", "speaker": ChatMessage.getSpeaker({ actor: actor })};
                        ChatMessage.create(chatData);
                    } catch (error) {
                        console.error("Values other than formula, @level, D dice are not allowed.");
                    }
                    console.log(num)
                    actorupdates["system.attributes.hp.value"] = actor.system.attributes.hp.value + num
                }
                //evaluate encroach modification at interval
                if ((item.system.modEncroach.value != "") && (item.system.active.state) && (active.findIndex(i => i == item.system.modEncroach.timing) != -1)){
                    console.log("hello!! we're in here!!")
                    let num = 0;
                    try {
                        num = item.system.modEncroach.value
                        if (num.indexOf('@level') != -1){
                            num = num.replace("@level", item.system.level.init);
                        }
                        if (num.indexOf('D') != -1){
                            
                            let front = num.substring(0,num.indexOf('D'))
                            let back = num.substring(num.indexOf('D')+1)
                            front += "d10"
                            let roll = new Roll(front);
                            await roll.evaluate({async: true});
                            num = roll.total + back
                        }
                        num = math.evaluate(num)
                        let chatData = {"content": `<div class="context-box">${actor.name}: ${actor.system.attributes.encroachment.value} -> ${actor.system.attributes.encroachment.value + num} (+${num})</div>`, "speaker": ChatMessage.getSpeaker({ actor: actor })};
                        ChatMessage.create(chatData);
                    } catch (error) {
                        console.error("Values other than formula, @level, D dice are not allowed.");
                    }
                    console.log(num)
                    actorupdates["system.attributes.encroachment.value"] = actor.system.attributes.encroachment.value + num
                }
                if (active.findIndex(i => i == item.system.active.disable) != -1){
                    updates["system.active.state"] = false;
                }
            }
            
            await item.update(updates);
        }
        for (let [key, effect] of Object.entries(actor.system.attributes.applied)) {
            console.log(effect)
            //apply HP effect
            if (active.findIndex(i => i == effect.modHP.timing) != -1){
                console.log("hello!! we're in here!!")
                let num = 0;
                try {
                    num = effect.modHP.value
                    if (num.indexOf('@level') != -1){
                        let tmp = game.actors.get(effect.actorId).items.get(effect.itemId)
                        num = num.replace("@level", tmp.system.level.init);
                    }
                    if (num.indexOf('D') != -1){
                        
                        let front = num.substring(0,num.indexOf('D'))
                        let back = num.substring(num.indexOf('D')+1)
                        front += "d10"
                        let roll = new Roll(front);
                        await roll.evaluate({async: true});
                        num = roll.total + back
                    }
                    num = math.evaluate(num)
                    let chatData = {"content": actor.name + " (" + num + ")", "speaker": ChatMessage.getSpeaker({ actor: actor })};
                    ChatMessage.create(chatData);
                } catch (error) {
                    console.log(error)
                    console.error("Values other than formula, @level, D dice are not allowed.");
                }
                console.log(num)
                actorupdates["system.attributes.hp.value"] = actor.system.attributes.hp.value + num
            }
            //apply encroach effect
            if (active.findIndex(i => i == effect.modEncroach.timing) != -1){
                console.log("hello!! we're in here!!")
                let num = 0;
                try {
                    num = effect.modEncroach.value
                    if (num.indexOf('@level') != -1){
                        let tmp = game.actors.get(effect.actorId).items.get(effect.itemId)
                        console.log(tmp)
                        num = num.replace("@level", tmp.system.level.init);
                    }
                    if (num.indexOf('D') != -1){
                        
                        let front = num.substring(0,num.indexOf('D'))
                        let back = num.substring(num.indexOf('D')+1)
                        front += "d10"
                        let roll = new Roll(front);
                        await roll.evaluate({async: true});
                        num = roll.total + back
                    }
                    num = math.evaluate(num)
                    let chatData = {"content": `<div class="context-box">${actor.name}: ${actor.system.attributes.encroachment.value} -> ${actor.system.attributes.encroachment.value + num} (+${num})</div>`, "speaker": ChatMessage.getSpeaker({ actor: actor })};
                    ChatMessage.create(chatData);
                } catch (error) {
                    console.error("Values other than formula, @level, D dice are not allowed.");
                }
                console.log(num)
                actorupdates["system.attributes.encroachment.value"] = actor.system.attributes.encroachment.value + num
            }
            //negate applied
            if (active.findIndex(i => i == effect.disable) != -1){
                actorupdates[`system.attributes.applied.-=${key}`] = null;
            }
        }
        actor.update(actorupdates);
    }

}
