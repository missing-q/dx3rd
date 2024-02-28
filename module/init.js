
//Import Modules
import { DX3rdActor } from "./document/actor.js";
import { DX3rdItem } from "./document/item.js";
import { DX3rdActiveEffect } from "./document/active-effect.js";
import { DX3rdActorSheet } from "./sheet/actor-sheet.js";
import { DX3rdItemSheet } from "./sheet/item-sheet.js";
import { DX3rdWorksSheet } from "./sheet/works-sheet.js";
import { DX3rdEffectSheet } from "./sheet/effect-sheet.js";
import { DX3rdComboSheet } from "./sheet/combo-sheet.js";
import { DX3rdRoisSheet } from "./sheet/rois-sheet.js";
import { DX3rdEquipmentSheet } from "./sheet/equipment-sheet.js";

import { WeaponDialog } from "./dialog/weapon-dialog.js";
import { SelectItemsDialog } from "./dialog/select-items-dialog.js";
import { DamageDialog } from "./dialog/damage-dialog.js";
import { DefenseDialog } from "./dialog/defense-dialog.js";
import { ServantDialog } from "./dialog/servant-dialog.js";
import { DX3rdDiceTerm } from "./dice/dice-term.js";

import { DX3rdRegisterHelpers } from "./handlebars.js";
import { DisableHooks } from "./disable-hooks.js";
import { SocketController } from "./socket.js";
import { DX3rdCombat } from "./combat.js";


/* -------------------------------------------- */
/*  Foundry VTT Initialization                  */
/* -------------------------------------------- */

/**
 * Init hook.
 */
Hooks.once("init", async function() {
  console.log(`Initializing Double Cross 3rd System`);

  game.DX3rd = {
    baseSkills: game.system.model.Actor.character.attributes.skills,
    itemUsage: {},
    DamageDialog: []
  }


  // Register sheet application classes
  Actors.unregisterSheet("core", ActorSheet);
  Actors.registerSheet("dx3rd", DX3rdActorSheet, { makeDefault: true });
  Items.unregisterSheet("core", ItemSheet);
  Items.registerSheet("dx3rd", DX3rdItemSheet, { makeDefault: false });
  Items.registerSheet("dx3rd", DX3rdWorksSheet, {
    types: ['works'],
    makeDefault: true
  });
  Items.registerSheet("dx3rd", DX3rdEffectSheet, {
    types: ['effect'],
    makeDefault: true
  });
  Items.registerSheet("dx3rd", DX3rdComboSheet, {
    types: ['combo'],
    makeDefault: true
  });
  Items.registerSheet("dx3rd", DX3rdRoisSheet, {
    types: ['rois'],
    makeDefault: true
  });
  
  Items.registerSheet("dx3rd", DX3rdEquipmentSheet, {
    types: ['weapon', 'protect', 'vehicle', 'connection', 'item'],
    makeDefault: true
  });

  CONFIG.Actor.documentClass = DX3rdActor;
  CONFIG.Item.documentClass = DX3rdItem;
  CONFIG.ActiveEffect.documentClass = DX3rdActiveEffect;
  CONFIG.Dice.terms.x = DX3rdDiceTerm;

  DX3rdRegisterHelpers.init();
  DisableHooks.init();
  SocketController.init();
  DX3rdActiveEffect.registerHUDListeners();

  CONFIG.Combat.documentClass = DX3rdCombat;
  CONFIG.Combat.initiative.formula = "@attributes.init.value"

  //define bad statuses
  CONFIG.statusEffects = [
    {
      id: "pressure",
      name: `${game.i18n.localize("DX3rd.Pressure")}`,
      icon: "icons/svg/downgrade.svg"
    },
    {
      id: "rigor",
      name: `${game.i18n.localize("DX3rd.Rigor")}`,
      icon: "icons/svg/falling.svg",
      changes: [
        { key: "system.attributes.move.battle", mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE, value: 0 },
        { key: "system.attributes.move.full", mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE, value: 0 }
      ]
    },
    {
      id: "taint",
      name: `${game.i18n.localize("DX3rd.Taint")}`,
      icon: "systems/dx3rd/icons/svg/taint.svg"
    },
    {
      id: "dazed",
      name: `${game.i18n.localize("DX3rd.Dazed")}`,
      icon: "icons/svg/daze.svg",
      changes: [
        { key: "system.attributes.dice.value", mode: CONST.ACTIVE_EFFECT_MODES.ADD, value: -2 }
      ]
    },
    {
      id: "berserk",
      name: `${game.i18n.localize("DX3rd.Berserk")}`,
      icon: "systems/dx3rd/icons/svg/berserk.svg"
    },
    {
      id: "hatred",
      name: `${game.i18n.localize("DX3rd.Hatred")}`,
      icon: "systems/dx3rd/icons/svg/hatred.svg"
    }
  ];

  Roll.TOOLTIP_TEMPLATE = "systems/dx3rd/templates/dice/tooltip.html";
  DiceTerm.fromMatch = (match) => {
    let [number, denomination, modifiers, flavor] = match.slice(1);

    // Get the denomination of DiceTerm
    denomination = denomination.toLowerCase();
    const cls = denomination in CONFIG.Dice.terms ? CONFIG.Dice.terms[denomination] : CONFIG.Dice.terms.d;
    if ( !getParentClasses(cls).includes(DiceTerm) ) {
      throw new Error(`DiceTerm denomination ${denomination} not registered to CONFIG.Dice.terms as a valid DiceTerm class`);
    }

    // Get the term arguments
    number = Number.isNumeric(number) ? parseInt(number) : 1;
    const faces = Number.isNumeric(denomination) ? parseInt(denomination) : null;

    if (denomination == "x")
      return new cls({number, faces, modifiers: [modifiers], options: {flavor}});

    // Match modifiers
    modifiers = Array.from((modifiers || "").matchAll(DiceTerm.MODIFIER_REGEXP)).map(m => m[0]);

    // Construct a term of the appropriate denomination
    return new cls({number, faces, modifiers, options: {flavor}});
  }


});


Hooks.once("ready", async function() {
    game.settings.set("core", "defaultToken", {"disposition": 0});
});


Hooks.on("setActorEncroach", (actor, key, encroach) => {
  game.DX3rd.itemUsage[key] = {
    actor: actor,
    encroach: encroach,
    target: false,
    roll: false
  };

});


Hooks.on("updateActorEncroach", async (actor, key, type) => {
  let itemUsage = game.DX3rd.itemUsage[key];
  itemUsage[type] = true;
  if (itemUsage.target && itemUsage.roll) {
    //console.log(itemUsage.encroach);

    const last = Number(actor.system.attributes.encroachment.value);
    let encroach = Number(actor.system.attributes.encroachment.value) + itemUsage.encroach;

    let chatData = {
      speaker: ChatMessage.getSpeaker({actor: actor}),
      sound: CONFIG.sounds.notification
    };

    if (Number.isNumeric(itemUsage.encroach))
      chatData.content = `<div class="context-box">${actor.name}: ${last} -> ${encroach} (+${ itemUsage.encroach })</div>`;
    else {
      let roll = new Roll(itemUsage.encroach);
      await roll.roll({async: true});

      let rollData = await roll.render();

      encroach = Number(actor.system.attributes.encroachment.value) + roll.total;
      chatData.content = `
        <div class="dx3rd-roll" data-actor-id=${actor.id}>
          <h2 class="header"><div class="title">${actor.name}: ${last} -> ${encroach} (+${ roll.total })</div></h2>
          ${rollData}
        </div>
      `;
      chatData.type = CONST.CHAT_MESSAGE_TYPES.ROLL;
      chatData.sound = CONFIG.sounds.dice;
      chatData.roll = roll;
    }
    
    await actor.update({"system.attributes.encroachment.value": encroach});
    let rollMode = game.settings.get("core", "rollMode");
    ChatMessage.create(chatData, {rollMode});

  }

});

Hooks.on("updateEffectUses", async (effect, uses) => {
    await effect.update({"system.uses.current": uses});
});

Hooks.on("dialogNoUsesLeft", async (actor, effect) => {
  let chatData = {
    speaker: ChatMessage.getSpeaker({actor: actor})
  };
  chatData.content = `
  <div class="dx3rd-roll" data-actor-id=${actor.id}>
  <h2 class="header"><div class="title">${actor.name} ran out of uses for ${effect.name}!</div></h2>
  </div>
  `;
  let rollMode = game.settings.get("core", "rollMode");
  chatData.type = CONST.CHAT_MESSAGE_TYPES.ROLL;
  chatData.sound = CONFIG.sounds.dice;
  ChatMessage.create(chatData, {rollMode});
});


Hooks.on("updateActorDialog", function() {
    let reload = (dialogs) => {
        let d = dialogs.filter(e => e._state != -1);
        if (d.length != 0) {
            for (let dialog of d)
                dialog.render(true);
        }
        
        return d
    }
    
    game.DX3rd.DamageDialog = reload(game.DX3rd.DamageDialog);
});

Hooks.on("updateItem", () => Hooks.call("updateActorDialog"));

Hooks.on("getSceneControlButtons", function(controls) {
  controls[0].tools.push({
    name: "EnterScene",
    title: game.i18n.localize("DX3rd.EnterScene"),
    icon: "fas fa-dice",
    visible: true,
    onClick: () => {
      if (game.user.character != null) {
        let actor = game.actors.get(game.user.character.id);
        Hooks.call("enterScene", actor);
      }

      let share = game.user.id;
      let users = game.users.filter(u => u.active && u.character != null && u.character.id !== share);
      for (let user of users) {
        game.socket.emit("system.dx3rd", { id: "enterScene", sender: game.user.id, receiver: user.id, data: {
          actorId: user.character.id
        } });
      }

    },
    button: true
  });

});

Hooks.on("deleteCombat", async function (data, delta) {
    let actors = data.turns.reduce( (acc, i) => {
        acc.push(i.actor);
        return acc; 
    }, []);
    
    Hooks.call("afterCombat", actors);
  
});

Hooks.on("updateCombat", async function (data, delta) {
    var close = true;
    console.log(data)
    let prev = data.getCombatantByToken(data.previous.tokenId).actor
    if (prev != undefined){
      Hooks.call("afterTurn", prev);
    }
    //call setup/cleanup hooks
    let curr = data.getCombatantByToken(data.current.tokenId).actorId
    if (curr == data.getFlag("dx3rd", "startActor")){
      let actors = data.turns.reduce( (acc, i) => {
        acc.push(i.actor);
        return acc; 
      }, []);
      Hooks.call("onSetup", actors);

    } else if (curr == data.getFlag("dx3rd", "endActor")){
      let actors = data.turns.reduce( (acc, i) => {
        acc.push(i.actor);
        return acc; 
      }, []);
      Hooks.call("onCleanup", actors);
    }
    if (data.round == 0){
      return;
    }
    
    //call afterturn hook for previous actor

    if (delta.round != undefined  ) {
        let actors = data.turns.reduce( (acc, i) => {
            acc.push(i.actor);
            return acc; 
        }, []);
        
        Hooks.call("afterRound", actors);
    }

    
    
});

Hooks.on("hotbarDrop", async (bar, data, slot) => {
  if (data.data == undefined)
    return false;

  const command = `const a = game.actors.get("${data.actorId}");\nconst item = a.items.get("${system._id}");\nitem.toMessage()`;
  let macro = game.macros.contents.find(m => (m.name === system.name) && (m.command === command));

  if (!macro) {
    macro = await Macro.create({
      name: system.name,
      type: "script",
      command: command,
      img: system.img
    });
  }

  game.user.assignHotbarMacro(macro, slot);
  return false;
});

Hooks.on("renderChatLog", (app, html, data) => chatListeners(html));
Hooks.on("renderChatPopout", (app, html, data) => chatListeners(html));

function parseItemVals(str, level){
  let num = str
  if (isNaN(num)){
    try {
      if (num.indexOf('@level') != -1){
        num = num.replace("@level", level);
      }
    } catch (e){
      num = 0;
    }
  }
  return math.evaluate(num)
}

async function rollAbilityValue(rolls, item, actor, updates ){
  for (const [key, attr] of Object.entries(rolls)){
    let num = 0;
      try {
          num = attr.rollformula
          if (num.indexOf('@level') != -1){
            num = num.replace("@level", item.system.level.value || item.system.level.init);
          }
          console.log(num)
          if (num.indexOf('D') != -1){
              
              let front = num.substring(0,num.indexOf('D'))
              let back = num.substring(num.indexOf('D')+1)
              front += "d10"
              let roll = new Roll(front);
              await roll.roll({async: true});
              let rollData = await roll.render();
              let rollMode = game.settings.get("core", "rollMode");
              let content = `
                <div class="dx3rd-roll">
                  <h2 class="header">
                    <div class="title">Roll Ability Value: ${key}</div></h2>
                  <div class="context-box">
                    ${item.name}
                  </div>
                  ${rollData}
              `;
              ChatMessage.create({
                speaker: ChatMessage.getSpeaker({actor: actor}),
                content: content + `</div>`,
                type: CONST.CHAT_MESSAGE_TYPES.ROLL,
                sound: CONFIG.sounds.dice,
                roll: roll,
              }, {rollMode});
          
              num = roll.total + back
          }
          num = math.evaluate(num)
          
      } catch (error) {
        console.log(error)
        console.error("Values other than formula, @level, D dice are not allowed.");
      }
      console.log(num)
      updates[`system.attributes.${key}.rollvalue`] = num
  }
  return updates;
}

async function chatListeners(html) {
  html.on('click', '.use-effect', async ev => {
    ev.preventDefault();
    const itemInfo = ev.currentTarget.closest(".dx3rd-item-info");
    const actor = game.actors.get(itemInfo.dataset.actorId);
    const item = actor.items.get(itemInfo.dataset.itemId);

    let skill = item.system.skill;
    let base = "";
    const rollType = item.system.roll;
    const attackRoll = item.system.attackRoll;
    const encroach = Number.isNaN(Number(item.system.encroach.value)) ? item.system.encroach.value : Number(item.system.encroach.value);
    const isUses = item.system.uses.active
    let currentUses = item.system.uses.current

    let mainStat = ["body", "sense", "mind", "social"];
    if (mainStat.includes(skill)) {
      base = skill;
      skill = "-";
    }
    console.log(item)
    if (item.system.flags.owned.find((obj) => obj.name == 'isRedServant')){
      new ServantDialog(actor).render(true)
    } else {
      //check for conditionals apply - combined version
      actor.items.forEach(e => { 
        let cont =  true;
        if ((e.type == "effect") && (e.system.active.state)){
          const preconds = [(e.system.checkSyndrome),(e.system.typeCheck != "-"),(e.system.targetCheck != "-") ]
          const postconds = [(item.system.syndrome == e.system.syndrome), (item.system.attackRoll == e.system.typeCheck), (item.system.attackTarget == e.system.targetCheck)]

          if (!preconds.every(v => v === false)){ //make sure not every single entry in the array is false so we dont erroneously apply
            for (let i = 0; i < preconds.length; i++){
              if (preconds[i]){ //we dont do anything if the precond is false because that just determines whether we should proceed down that condition line
                if (!postconds[i]){ //however if at least one postcond is false then we should cancel 
                  cont = false; 
                }
              }
            }

            if (cont){
              console.log("yay match :)")
              e.applyTarget(actor, true, false, false)
            }
          }
        }
      })

      console.log(actor)
      if (!item.system.disabled) {

        //check for item creation
        if (item.system.createItem.active){
          let itemList = []
          //create all weapons
          for (let i = 0; i < item.system.createItem.weapons.length; i++){
            let val = item.system.createItem.weapons[i]
            let newItem = {
              type : "weapon",
              name: val.name,
              img: "icons/svg/sword.svg",
              system: {
                type: val.equiptype,
                skill: val.skill,
                add: parseItemVals(val.add, item.system.level.value),
                attack: parseItemVals(val.attack,item.system.level.value),
                guard: parseItemVals(val.guard,item.system.level.value),
                range: val.range,
                timing: val.timing,
                exp: val.exp,
                saving: {
                  value: val.stock,
                  difficulty: val.procure
                }
              }
            }
            itemList.push(newItem)
          }
          //create all armor
          for (let i = 0; i < item.system.createItem.armor.length; i++){
            let val = item.system.createItem.armor[i]
            let newItem = {
              type : "protect",
              name: val.name,
              img: "icons/svg/shield.svg",
              system: {
                dodge: parseItemVals(val.dodge, item.system.level.value),
                armor: parseItemVals(val.armor, item.system.level.value),
                init: parseItemVals(val.init, item.system.level.value),
                timing: val.timing,
                exp: val.exp,
                saving: {
                  value: val.stock,
                  difficulty: val.procure
                }
              }
            }
            itemList.push(newItem)
          }
          //create all vehicles
          for (let i = 0; i < item.system.createItem.vehicles.length; i++){
            let val = item.system.createItem.vehicles[i]
            let newItem = {
              type : "vehicle",
              name: val.name,
              img: "icons/svg/wing.svg",
              system: {
                skill: val.skill,
                move: val.move,
                attack: parseItemVals(val.attack,item.system.level.value),
                armor: parseItemVals(val.armor, item.system.level.value),
                init: parseItemVals(val.init, item.system.level.value),
                timing: val.timing,
                exp: val.exp,
                saving: {
                  value: val.stock,
                  difficulty: val.procure
                }
              }
            }
            itemList.push(newItem)
          }
          //create all items
          for (let i = 0; i < item.system.createItem.items.length; i++){
            let val = item.system.createItem.items[i]
            let newItem = {
              type : "item",
              name: val.name,
              img: "icons/svg/wing.svg",
              system: {
                type: val.type,
                timing: val.timing,
                exp: val.exp,
                saving: {
                  value: val.stock,
                  difficulty: val.procure
                }
              }
            }
            itemList.push(newItem)
          }
          if (item.system.createItem.select){
            let confirm = async (itemData) => {
              actor.createEmbeddedDocuments("Item", itemData)
            }
            console.log(itemList)
            let count = parseItemVals(item.system.createItem.count,item.system.level.value)
            new SelectItemsDialog(actor, itemList, count, confirm).render(true);
          } else {
            actor.createEmbeddedDocuments("Item", itemList)
          }
        }

        if (skill in actor.system.attributes.skills){
          base = actor.system.attributes.skills[skill].base;
        }
          

        let updates = {};
        if (item.system.active.disable != '-'){
          updates["system.active.state"] = true;
          //WE NEED TO DO OUR DICE ROLLS FOR ANY VALUES ON THE ABILITY HERE
          let rolls = {}
          let effectrolls = {}
          if (!(item.system.attributes == {})){
            for (const [key, attr] of Object.entries(item.system.attributes)){
              if (attr.rollformula){
                rolls[key] = attr //add to rolls
              }
            }
          }
          if (!(item.system.effect.attributes == {})){
            for (const [key, attr] of Object.entries(item.system.effect.attributes)){
              if (attr.rollformula){
                effectrolls[key] = attr //add to effectrolls
              }
            }
          }
          //console.log(rolls)
          updates = await rollAbilityValue(rolls,item, actor, updates)
          updates = await rollAbilityValue(effectrolls,item, actor, updates)
          
        }
        
        if (item.system.modHP.timing != '-'){
          updates["system.modHP.active"] = true;
        }
        if (item.system.modEncroach.timing != '-'){
          updates["system.modEncroach.active"] = true;
        }
        

        await item.update(updates);

        Hooks.call("setActorEncroach", actor, item.id, encroach);
        if (item.system.getTarget)
          await item.applyTargetDialog(true);
        else {
          const macro = game.macros.contents.find(m => (m.name === item.system.macro));
          if (macro != undefined)
              macro.execute();
          else if (item.system.macro != "")
              new Dialog({
                  title: "macro",
                  content: `Do not find this macro: ${item.system.macro}`,
                  buttons: {}
              }).render(true);

          Hooks.call("updateActorEncroach", actor, item.id, "target");
        }


        let append = false;
        if (event.ctrlKey)
          append = true;

        let diceOptions = {
          "key": item.id,
          "rollType": rollType,
          "base": base,
          "skill": skill,
          "actor": actor.id,
          "list": item.id
        };

        const title = item.name;
        if (diceOptions["rollType"] != '-') {
          if (attackRoll == "-")
            await actor.rollDice(title, diceOptions, append);
          else {
            let confirm = async (weaponData) => {
              diceOptions["attack"] = {
                "value": weaponData.attack,
                "type": item.system.attackRoll
              };
              if (item.system.effect.modReaction != ""){
                diceOptions["reaction"] = parseItemVals(item.system.effect.modReaction, item.system.level.value)
              }
              if (item.system.effect.modCritical != ""){
                diceOptions["critical"] = parseItemVals(item.system.effect.modCritical, item.system.level.value)
              }
              console.log(diceOptions)

              await actor.rollDice(title, diceOptions, append);
            }

            new WeaponDialog(actor, confirm).render(true);
          }

        } else {
          Hooks.call("updateActorEncroach", actor, item.id, "roll");
        }
        //update uses if needed
        if (isUses){
          let postUpdates = {};
          currentUses -= 1;
          if (currentUses <= 0){
            currentUses = 0;
            //disables the ability
            postUpdates["system.disabled"] = true
            postUpdates["system.active.state"] = false
            //post dialog to chat
            Hooks.call("dialogNoUsesLeft", actor, item);
          }
          postUpdates["system.uses.current"] = currentUses;
          item.update(postUpdates);   
        }
        Hooks.call("afterUse", actor);
        /*
        let applied = {}
        //un-apply conditional effects
        for (let [key, effect] of Object.entries(conditionals)) {
          console.log(effect)
          applied[`system.attributes.applied.-=${effect._id}`] = null
        }
        
        actor.update(applied)
        */
      }
    }
    

  });

  html.on('click', '.use-combo', async ev => {
    ev.preventDefault();
    const itemInfo = ev.currentTarget.closest(".dx3rd-item-info");
    const actor = game.actors.get(itemInfo.dataset.actorId);
    const item = actor.items.get(itemInfo.dataset.itemId);

    let updates = {};
    if (item.system.active.disable != '-')
        updates["system.active.state"] = true;
    await item.update(updates);

    let encroach = item.system.encroach.value;

    const skill = item.system.skill;
    const base = item.system.base;
    const rollType = item.system.roll;
    const attackRoll = item.system.attackRoll;
    //console.log(attackRoll)
    console.log(item)

    

    const effectItems = item.system.effect;
    //console.log(effectItems)
    const appliedList = [];
    const macroList = [];
    let reaction_dice = 0;
    let reaction_crit = 0;

    for (let e of effectItems) {
      if (e == "-"){
        continue;
      }
      let effect = actor.items.get(e);
      if (!effect.system.disabled){
        //check for item creation
        if (effect.system.createItem.active){
          let itemList = []
          //create all weapons
          for (let i = 0; i < effect.system.createItem.weapons.length; i++){
            let val = effect.system.createItem.weapons[i]
            let newItem = {
              type : "weapon",
              name: val.name,
              img: "icons/svg/sword.svg",
              system: {
                type: val.equiptype,
                skill: val.skill,
                add: parseItemVals(val.add, effect.system.level.value),
                attack: parseItemVals(val.attack,effect.system.level.value),
                guard: parseItemVals(val.guard,effect.system.level.value),
                range: val.range,
                timing: val.timing,
                exp: val.exp,
                saving: {
                  value: val.stock,
                  difficulty: val.procure
                }
              }
            }
            itemList.push(newItem)
          }
          //create all armor
          for (let i = 0; i < effect.system.createItem.armor.length; i++){
            let val = effect.system.createItem.armor[i]
            let newItem = {
              type : "protect",
              name: val.name,
              img: "icons/svg/shield.svg",
              system: {
                dodge: parseItemVals(val.dodge, effect.system.level.value),
                armor: parseItemVals(val.armor, effect.system.level.value),
                init: parseItemVals(val.init, effect.system.level.value),
                timing: val.timing,
                exp: val.exp,
                saving: {
                  value: val.stock,
                  difficulty: val.procure
                }
              }
            }
            itemList.push(newItem)
          }
          //create all vehicles
          for (let i = 0; i < effect.system.createItem.vehicles.length; i++){
            let val = effect.system.createItem.vehicles[i]
            let newItem = {
              type : "vehicle",
              name: val.name,
              img: "icons/svg/wing.svg",
              system: {
                skill: val.skill,
                move: val.move,
                attack: parseItemVals(val.attack,effect.system.level.value),
                armor: parseItemVals(val.armor, effect.system.level.value),
                init: parseItemVals(val.init, effect.system.level.value),
                timing: val.timing,
                exp: val.exp,
                saving: {
                  value: val.stock,
                  difficulty: val.procure
                }
              }
            }
            itemList.push(newItem)
          }
          //create all items
          for (let i = 0; i < effect.system.createItem.items.length; i++){
            let val = effect.system.createItem.items[i]
            let newItem = {
              type : "item",
              name: val.name,
              img: "icons/svg/wing.svg",
              system: {
                type: val.type,
                timing: val.timing,
                exp: val.exp,
                saving: {
                  value: val.stock,
                  difficulty: val.procure
                }
              }
            }
            itemList.push(newItem)
          }
          if (effect.system.createItem.select){
            let confirm = async (itemData) => {
              actor.createEmbeddedDocuments("Item", itemData)
            }
            console.log(itemList)
            let count = parseItemVals(effect.system.createItem.count,effect.system.level.value)
            new SelectItemsDialog(actor, itemList, count, confirm).render(true);
          } else {
            actor.createEmbeddedDocuments("Item", itemList)
          }
        }

        if ((effect.system.effect.disable != "-")){
          appliedList.push(effect);

          actor.items.forEach(f => { 
            let cont =  true;
            if ((f.type == "effect") && (f.system.active.state)){
              const preconds = [(f.system.checkSyndrome),(f.system.typeCheck != "-"),(f.system.targetCheck != "-") ]
              const postconds = [(e.system.syndrome == f.system.syndrome), (e.system.attackRoll == f.system.typeCheck), (e.system.attackTarget == f.system.targetCheck)]
      
              if (!preconds.every(v => v === false)){ //make sure not every single entry in the array is false so we dont erroneously apply
                for (let i = 0; i < preconds.length; i++){
                  if (preconds[i]){ //we dont do anything if the precond is false because that just determines whether we should proceed down that condition line
                    if (!postconds[i]){ //however if at least one postcond is false then we should cancel 
                      cont = false; 
                    }
                  }
                }
      
                if (cont){
                  console.log("yay match :)")
                  f.applyTarget(actor, true)
                }
              }
            }
          })

        }
        
        if (!effect.system.getTarget) {
          const macro = game.macros.contents.find(m => (m.name === effect.system.macro));

          if (macro != undefined){
            macro.execute();
          }
          else if (effect.system.macro != ""){
            new Dialog({
              title: "macro",
              content: `Do not find this macro: ${effect.system.macro}`,
              buttons: {}
            }).render(true);
          }
        } else if (effect.system.macro != ""){
          macroList.push(effect.system.macro);
        }
        let e_updates = {};
        if (effect.system.active.disable != '-'){
          e_updates["system.active.state"] = true;
          //WE NEED TO DO OUR DICE ROLLS FOR ANY VALUES ON THE ABILITY HERE
          let rolls = {}
          let effectrolls = {}
          if (!(effect.system.attributes == {})){
            for (const [key, attr] of Object.entries(effect.system.attributes)){
              if (attr.rollformula){
                rolls[key] = attr //add to rolls
              }
            }
          }
          if (!(effect.system.effect.attributes == {})){
            for (const [key, attr] of Object.entries(effect.system.effect.attributes)){
              if (attr.rollformula){
                effectrolls[key] = attr //add to effectrolls
              }
            }
          }
          //console.log(rolls)
          e_updates = await rollAbilityValue(rolls, effect, actor, e_updates)
          e_updates = await rollAbilityValue(effectrolls,effect, actor, e_updates)
        }
        if (effect.system.modHP.timing != '-'){
          e_updates["system.modHP.active"] = true;
        }
        if (effect.system.modEncroach.timing != '-'){
          e_updates["system.modEncroach.active"] = true;
        }
        //add reaction dice and crit penalty values
        if (effect.system.effect.modReaction != ""){
          reaction_dice += parseItemVals(effect.system.effect.modReaction, effect.system.level.value)
        }
        if (effect.system.effect.modCritical != ""){
          reaction_crit = parseItemVals(effect.system.effect.modCritical, effect.system.level.value)
        }

        //add in auto decrementing too
        if (effect.system.uses.active){
          let currentUses = effect.system.uses.current - 1
          if (currentUses <= 0){
            currentUses = 0;
            e_updates["system.active.state"] = false;
            e_updates["system.disabled"] = true;
            Hooks.call("dialogNoUsesLeft", actor, effect);
          }
          e_updates["system.uses.current"] = currentUses
        }
        console.log(e_updates)
        console.log(effect)
        await effect.update(e_updates);
      }

      
    }

    Hooks.call("setActorEncroach", actor, item.id, encroach);

    if (macroList.length == 0) {
      const macro = game.macros.contents.find(m => (m.name === item.system.macro));
      if (macro != undefined)
        macro.execute();
      else if (item.system.macro != "")
        new Dialog({
            title: "macro",
            content: `Do not find this macro: ${item.system.macro}`,
            buttons: {}
        }).render(true);
        
    } else if (item.system.macro != "")
      macroList.push(item.system.macro);

    if (!item.system.getTarget)
      Hooks.call("updateActorEncroach", actor, item.id, "target");
    else {
      new Dialog({
        title: game.i18n.localize("DX3rd.SelectTarget"),
        content: `
          <h2><b>${game.i18n.localize("DX3rd.SelectTarget")}</b></h2>
        `,
        buttons: {
          confirm: {
            icon: '<i class="fas fa-check"></i>',
            label: "Confirm",
            callback: async () => {
              let targets = game.user.targets;
              for (let t of targets) {
                let a = t.actor;

                for (let e of appliedList)
                  await e.applyTarget(a);

                for (let name of macroList) {
                  const macro = game.macros.contents.find(m => (m.name === name));
                  if (macro != undefined)
                      macro.execute();
                  else if (name != "")
                      new Dialog({
                          title: "macro",
                          content: `Do not find this macro: ${name}`,
                          buttons: {}
                      }).render(true);
                }
              }
              Hooks.call("updateActorEncroach", actor, item.id, "target");
            }
          }
        },
        close: () => {
          //Hooks.call("updateActorEncroach", actor, item.id, "target")
        }
      }, {top: 300, left: 20}).render(true);
    }


    let append = false;
    if (event.ctrlKey)
      append = true;

    const title = item.name;
    let diceOptions = {
      "key": item.id,
      "rollType": rollType,
      "base": base,
      "skill": skill,
      "actor": actor.id
    };
    //add to list
    for (let e of effectItems){
      diceOptions.list += e.id + " "
    }
    diceOptions.list = diceOptions.list.substring(0, diceOptions.list.length - 1);

    //console.log(item.system.attack)
    if (rollType != "-") {
      if (attackRoll == "-")
        await actor.rollDice(title, diceOptions, append);
      else {
        //console.log("attackroll is not null lol")
        if (item.system.weaponSelect) {
            let confirm = async (weaponData) => {
            diceOptions["attack"] = {
              "value": weaponData.attack + item.system.attack.value,
              "reaction": reaction_dice,
              "critical": reaction_crit,
              "type": attackRoll
            };

            await actor.rollDice(title, diceOptions, append);
          }
          new WeaponDialog(actor, confirm).render(true);

        } else {
          const weaponItems = Object.values(item.system.weaponItems);
          let attack = await weaponItems.reduce((acc, v) => acc + v.system.attack, 0);

          diceOptions["attack"] = {
            "value": attack + item.system.attack.value,
            "reaction": reaction_dice,
            "critical": reaction_crit,
            "type": attackRoll
          };

          await actor.rollDice(title, diceOptions, append);
        }

      }

    } else {
      Hooks.call("updateActorEncroach", actor, item.id, "roll");
    }
      
  });

  html.on('click', '.roll-attack', async ev => {
    ev.preventDefault();
    const itemInfo = ev.currentTarget.closest(".dx3rd-item-info");
    const actor = game.actors.get(itemInfo.dataset.actorId);
    const item = actor.items.get(itemInfo.dataset.itemId);

    let append = false;
    if (event.ctrlKey)
      append = true;

    const id = item.system.skill;
    const skill = actor.system.attributes.skills[id];
    const title = (skill.name.indexOf('DX3rd.') != -1) ? game.i18n.localize(skill.name) : skill.name;
    const type = (item.type == "vehicle") ? "melee" : item.system.type;

    const diceOptions = {
      "rollType": "major",
      "attack": {
        "value": item.system.attack,
        "type": type
      },
      "base": skill.base,
      "skill": id
    };

    await actor.rollDice(title, diceOptions, append);
  });


  html.on('click', '.calc-damage', async ev => {
      ev.preventDefault();
      const data = ev.currentTarget.dataset;
      const attack = Number(data.attack);
      const reaction = data.reaction
      const critical = data.critical
      const rolldata = data.roll 
      const actor = data.actor
      const list = data.list
      const id = data.id

      console.log(ev)
      const rollResult = Number($(ev.currentTarget).parent().find(".dice-total").first().text());


      new Dialog({
        title: game.i18n.localize("DX3rd.CalcDamage"),
        content: `
            <h2 style="text-align: center;">[${rollResult} / 10 + 1]D10 + ${attack}</h2>

            <table class="calc-dialog">
              <tr>
                <th>${game.i18n.localize("DX3rd.IgnoreArmor")}</th>
                <td><input type="checkbox" id="ignore-armor"></td>

                <th>${game.i18n.localize("DX3rd.AddResult")}</th>
                <td><input type="number" id="add-result"></td>
              </tr>
              <tr>
                <th>${game.i18n.localize("DX3rd.AddDamage")}</th>
                <td colspan="3"><input type="number" id="add-damage"></td>
              </tr>

            </table>
        `,
        buttons: {
          confirm: {
            icon: '<i class="fas fa-check"></i>',
            label: "Confirm",
            callback: async () => {
              let ignoreArmor = $("#ignore-armor").is(":checked");
              let addResult = ($("#add-result").val() != "") ? Number($("#add-result").val()) : 0;
              let addDamage = ($("#add-damage").val() != "") ? Number($("#add-damage").val()) : 0;
              let formula = `${parseInt((rollResult + addResult) / 10) + 1}d10 + ${attack + addDamage}`;

              let roll = new Roll(formula);
              await roll.roll({async: true})

              let rollMode = game.settings.get("core", "rollMode");
              let rollData = await roll.render();
              let content = `
                <div class="dx3rd-roll">
                  <h2 class="header"><div class="title">${game.i18n.localize("DX3rd.CalcDamage")}</div></h2>
                  ${rollData}
              `;
              //content += <button class="chat-btn apply-damage" data-damage="${roll.total}" data-ignore-armor="${ignoreArmor}">${game.i18n.localize("DX3rd.ApplyDamage")}</button>
              //

              content += `<button class="chat-btn choose-defense" data-reaction="${reaction}" data-critical="${critical}" data-roll="${rolldata}" data-damage="${roll.total}" data-ignorearmor="${ignoreArmor}" data-actor="${actor}" data-id="${id}" data-list="${list}" >${game.i18n.localize("DX3rd.Defend")}</button>`;
              content += '</div>'

              ChatMessage.create({
                content: content,
                type: CONST.CHAT_MESSAGE_TYPES.ROLL,
                sound: CONFIG.sounds.dice,
                roll: roll,
              }, {rollMode});

            }
          }
        },
        default: "confirm"
      }).render(true);




  });

  html.on('click', '.apply-damage', async ev => {
      event.preventDefault();
      const dataset = ev.currentTarget.dataset;
      const damage = Number(dataset.damage);
      const ignoreArmor = dataset.ignoreArmor == 'true';
      const data = { ignoreArmor: ignoreArmor, guard: dataset.guard, list: dataset.list, origin: dataset.actor};

      const targets = game.users.get(game.user.id).targets;
      for (var target of targets) {
        let actor = target.actor;
        let actorData = actor.system;
        let realDamage = damage;

        let share = game.user.id;
        for (let user of game.users)
            if (user.active && user.character != null && user.character.id === actor.id) {
                share = user.id;
                break;
            }
            
        if (share == game.user.id)
            Hooks.call("applyDamage", { actor, data: { data, realDamage } });
        else {
            game.socket.emit("system.dx3rd", { id: "applyDamage", sender: game.user.id, receiver: share, data: {
               actorId: actor.id,
               data,
               realDamage
            } });
        }

      }


  });

  html.on('click', '.choose-defense', async ev => {
    event.preventDefault();
    const dataset = ev.currentTarget.dataset;
    const reaction = Number(dataset.reaction) || 0;
    const critical = Number(dataset.critical) || 0;
    const roll = Number(dataset.roll) || 0;
    const damage = Number(dataset.damage) || 0;
    const ignoreArmor = dataset.ignorearmor
    const baseactor = dataset.actor
    const id = dataset.id
    const list = dataset.list
    const damageData = {
      damage: damage,
      ignoreArmor: ignoreArmor
    }
    const targets = game.users.get(game.user.id).targets;

    for (var target of targets) {
      let actor = target.actor;
      let actorData = actor.system;
      let share = game.user.id;
      for (let user of game.users)
          if (user.active && user.character != null && user.character.id === actor.id) {
              share = user.id;
              break;
          }
          
      if (share == game.user.id)
          Hooks.call("chooseDefense", { actor, data: {reaction:reaction, critical:critical, roll:roll, damageData:damageData, actor:baseactor, id:id, list:list} });
      else {
          game.socket.emit("system.dx3rd", { id: "chooseDefense", sender: game.user.id, receiver: share, data: {
             actorId: actor.id,
             reaction,
              critical,
              roll,
              damageData,
              baseactor,
              id,
              list
          } });
      }

    }


});



  html.on('click', '.toggle-btn', async ev => {
    ev.preventDefault();
    const toggler = $(ev.currentTarget);
    const style = ev.currentTarget.dataset.style;
    const item = toggler.parent();
    const description = item.find('.' + style);

    toggler.toggleClass('open');
    description.slideToggle();
  });

  html.on('click', '.titus', async ev => {
    ev.preventDefault();
    const itemInfo = ev.currentTarget.closest(".dx3rd-item-info");
    const actor = game.actors.get(itemInfo.dataset.actorId);
    const item = actor.items.get(itemInfo.dataset.itemId);

    await item.setTitus();

  });

  html.on('click', '.sublimation', async ev => {
    ev.preventDefault();
    const itemInfo = ev.currentTarget.closest(".dx3rd-item-info");
    const actor = game.actors.get(itemInfo.dataset.actorId);
    const item = actor.items.get(itemInfo.dataset.itemId);

    await item.setSublimation();

  });

}

Hooks.on("applyDamage", ({actor, data}) => {
  new DamageDialog(actor, data).render(true);
})

Hooks.on("chooseDefense", ({actor, data}) => {
  new DefenseDialog(actor, data).render(true);
})

Hooks.on("enterScene", (actor) => {
  let enterDialog = new Dialog({
    title: game.i18n.localize("DX3rd.EnterScene"),
    content: `
      <h2>${game.i18n.localize("DX3rd.EnterScene")}</h2>
    `,
    buttons: {
      one: {
        icon: '<i class="fas fa-check"></i>',
        label: game.i18n.localize("DX3rd.EnterScene"),
        callback: async () => {
          let formula =`1D10`;

          let roll = new Roll(formula);
          await roll.roll({async: true})

          let before = actor.system.attributes.encroachment.value;
          let after = Number(before) + Number(roll.total);

          await actor.update({"system.attributes.encroachment.value": after});

          let rollMode = game.settings.get("core", "rollMode");
          let rollData = await roll.render();
          let content = `
            <div class="dx3rd-roll">
              <h2 class="header"><div class="title">${actor.name} ${game.i18n.localize("DX3rd.EnterScene")}</div></h2>
              <div class="context-box">
                ${game.i18n.localize("DX3rd.Encroachment")}: ${before} -> ${after} (+${roll.total})
              </div>
              ${rollData}
          `;

          ChatMessage.create({
            speaker: ChatMessage.getSpeaker({actor: actor}),
            content: content + `</div>`,
            type: CONST.CHAT_MESSAGE_TYPES.ROLL,
            sound: CONFIG.sounds.dice,
            roll: roll,
          }, {rollMode});
        }
      }
    }
  });

  enterDialog.render(true);
})
