
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
            
            if (item.system.active != (undefined))
            if (active.findIndex(i => i == item.system.active.disable) != -1){
                //evaluate HP modification at interval
                console.log(item.system.modHP)
                console.log(item.system.active.state)
                if ((item.system.modHP != "") && (item.system.active.state)){
                    console.log("hello!! we're in here!!")
                    let num = 0;
                    try {
                        num = item.system.modHP
                        if (num.indexOf('@level') != -1){
                            num = num.replace("@level", level);
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
                    } catch (error) {
                        console.error("Values other than formula, @level, D dice are not allowed.");
                    }
                    console.log(num)
                    updates["system.active.state"]
                    actorupdates["system.attributes.hp.value"] = actor.system.attributes.hp.value + num
                }
                console.log(actor.system.attributes.hp.value)
                updates["system.active.state"] = false;
            }
            await item.update(updates);
        }

        
        for (let [key, effect] of Object.entries(actor.system.attributes.applied)) {
            if (active.findIndex(i => i == effect.disable) != -1)
                actorupdates[`system.attributes.applied.-=${key}`] = null;
        }
        await actor.update(actorupdates);
    }

}
