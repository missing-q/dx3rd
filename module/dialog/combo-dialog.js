
import { WeaponDialog } from "./weapon-dialog.js";

export class ComboDialog extends Dialog {

  constructor(actor, title, diceOptions, append, data, options) {
    super(options);

    this.actor = actor;

    this.chatTitle = game.i18n.localize("DX3rd.Combo") + ": " + title; 
    this.skillId = diceOptions.skill;
    this.base = diceOptions.base;
    this.return = diceOptions.return || false
    this.appendDice = diceOptions.appendDice || 0;
    this.appendCritical = diceOptions.appendCritical || 0;
    this.noRoll = diceOptions.noRoll;
    this.rollType = diceOptions.rollType || "major"
    console.log(this.rollType)

    if (this.skillId != null)
      this.skill = actor.system.attributes.skills[this.skillId];
    else
      this.skill = "-";

    this.append = append;

    this.data = data || {
      title: game.i18n.localize("DX3rd.Combo"),
      content: "",
      buttons: {
        create: {
          label: "Apply",
          callback: () => this._onSubmit()

        }
      },
      default: 'create'
    };

  }

  //custom wait implement
  static async wait(actor, title, diceOptions, append) {
    return new Promise((resolve, reject) => {

      let data = {
        title: game.i18n.localize("DX3rd.Combo"),
        content: "",
        buttons: {
          create: {
            label: "Apply",
            //callback: () => this._onSubmit()
  
          }
        },
        default: 'create'
      };

      // Wrap buttons with Promise resolution.
      const buttons = foundry.utils.deepClone(data.buttons);
      for ( const [id, button] of Object.entries(buttons) ) {
        const cb = button.callback;
        function callback(html, event) {
          const result = this._onSubmit()
          resolve(result === undefined ? id : result);
        }
        button.callback = callback;
      }

      // Wrap close with Promise resolution or rejection.
      const originalClose = data.close;
      const close = () => {
        const result = originalClose instanceof Function ? originalClose() : undefined;
        if ( result !== undefined ) resolve(result);
        else reject(new Error("The Dialog was closed without a choice being made."));
      };
      data.close = close;
      data.buttons = buttons;

      console.log(data)

      // Construct the dialog.
      const dialog = new this(actor, title, diceOptions, append, data);
      dialog.render(true);
    });
  }

  /** @override */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      template: "systems/dx3rd/templates/dialog/combo-dialog.html",
      classes: ["dx3rd", "dialog"],
      width: 600
    });
  }

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    html.find('.item-label').click(this._onShowItemDetails.bind(this));
    html.find(".echo-item").click(this._echoItemDescription.bind(this));
  }

  async _rollAbilityValue(rolls, item, actor, updates ){
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

  _parseItemVals(str, level){
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

  /** @override */
  getData() {
    let actorSkills = duplicate(this.actor.system.attributes.skills);
    //grab subskills
    for (const [key, value] of Object.entries(actorSkills)){
      if (value.category){
        for (const [key2, val2] of Object.entries(value.subskills)){
          let tmp = val2;
          tmp.name = `${value.name}:${val2.name}`
          actorSkills[key2] = tmp
        }
      }
    }
    this.actorSkills = actorSkills;

    let effectList = [];

    for (let i of this.actor.items) {
      if (i.type == 'effect')
        effectList.push(i);
    }

    return {
      title: this.title,
      content: this.data.content,
      buttons: this.data.buttons,
      
      actor: this.actor,
      skill: this.skillId,
      base: this.base,
      effectList: effectList,
      actorSkills: actorSkills,
      rollType: this.rollType
    }
  }

  async _onSubmit() {
    let effectList = [];
    let macroList = [];
    let applied = {};
    let key = this.id;
    
    let encroachStr = [];
    let encroach = 0;
    let actor = this.actor;
    let item = this;
    let updates = {}
    let reaction_dice = 0;
    let reaction_crit

    await $(".active-effect").each(async (i, val) => {
      if ($(val).is(":checked")) {
        let effect = this.actor.items.get(val.dataset.id);
        effectList.push(effect);
        
        if ( Number.isNaN(Number(effect.system.encroach.value)) )
          encroachStr.push(effect.system.encroach.value);
        else
          encroach += Number(effect.system.encroach.value);

        let updates = {};
        if (effect.system.active.disable != '-'){
          updates["system.active.state"] = true;
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
          updates = await this._rollAbilityValue(rolls, effect, actor, updates)
          updates = await this._rollAbilityValue(effectrolls,effect, actor, updates)
        
        }
        if (effect.system.modHP.timing != '-'){
          updates["system.modHP.active"] = true;
        }
        if (effect.system.modEncroach.timing != '-'){
          updates["system.modEncroach.active"] = true;
        }
        //add reaction dice and crit penalty values
        if (effect.system.effect.modReaction != ""){
          reaction_dice += this._parseItemVals(effect.system.effect.modReaction, effect.system.level.value)
        }
        if (effect.system.effect.modCritical != ""){
          reaction_crit = this._parseItemVals(effect.system.effect.modCritical, effect.system.level.value)
        }
        await effect.update(updates);
      }
    });

    if (encroachStr.length > 0)
        encroach += "+" + encroachStr.join("+");

    for (let effect of effectList) {
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
          actor.items.forEach(f => { 
            let cont =  true;
            if ((f.type == "effect") && (f.system.active.state)){
              const preconds = [(f.system.checkSyndrome),(f.system.typeCheck != "-"),(f.system.targetCheck != "-") ]
              const postconds = [(effect.system.syndrome == f.system.syndrome), (effect.system.attackRoll == f.system.typeCheck), (effect.system.attackTarget == f.system.targetCheck)]
      
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
                  f.applyTarget(actor, true, false, false, actor)
                }
              }
            }
          })
    
          if (!effect.system.getTarget) {
            const macro = game.macros.contents.find(m => (m.name === effect.system.macro));
            if (macro != undefined)
                macro.execute();
            else if (effect.system.macro != "")
                new Dialog({
                    title: "macro",
                    content: `Do not find this macro: ${effect.system.macro}`,
                    buttons: {}
                }).render(true);
          } else {
            macroList.push(effect);
          }
          
          let updates = {};
          if (effect.system.active.disable != '-')
              updates["system.active.state"] = true;
          //add in auto decrementing too
          if (effect.system.uses.active){
            let currentUses = effect.system.uses.current - 1
            if (currentUses <= 0){
              currentUses = 0;
              updates["system.active.state"] = false;
              updates["system.disabled"] = true;
              await item.update({'system.active.state':false});
              Hooks.call("dialogNoUsesLeft", actor, effect);
            }
            updates["system.uses.current"] = currentUses
          }
          await effect.update(updates);
        }
      }
    }

    Hooks.call("setActorEncroach", this.actor, key, encroach);


    let skill = $("#skill").val();
    let base = $("#base").val();
    let rollType = $("#roll").val();
    let attackRoll = $("#attackRoll").val();

    

    let content = `<button class="chat-btn toggle-btn" data-style="effect-list">${game.i18n.localize("DX3rd.Effect")}</button>
      <div class="effect-list">`;

    for (let e of effectList) {
      //console.log(e)
      content += `
        <div>
          <h4 class="item-name toggle-btn

      `
      console.log(e)
      if (e.system.disabled){
        content += `disabled" data-style="item-description">`;
      } else {
        content += `" data-style="item-description">`;
      }
      content += `<img src="${e.img}" width="20" height="20" style="vertical-align : middle;margin-right:8px;">`;

      content += `<span class="item-label">[${e.system.level.value}] ${e.name}<br>
              <span style="color : gray; font-size : smaller;">
                ${game.i18n.localize("DX3rd.Timing")} : ${ Handlebars.compile('{{timing arg}}')({arg: e.system.timing}) } / 
                ${game.i18n.localize("DX3rd.Skill")} : ${ Handlebars.compile('{{skillByKey actor key}}')({actor: this.actor, key: e.system.skill}) } / 
                ${game.i18n.localize("DX3rd.Target")} : ${e.system.target} / 
                ${game.i18n.localize("DX3rd.Range")} : ${e.system.range} /
                ${game.i18n.localize("DX3rd.Encroach")} : ${e.system.encroach.value} /
                ${game.i18n.localize("DX3rd.Limit")} : ${e.system.limit}
                <span class="item-details-toggle"><i class="fas fa-chevron-down"></i></span>
              </span>
            </span>
          </h4>
          <div class="item-description">${e.system.description}</div>
        </div>
        `;
    }
    content += `</div>`;

    let diceOptions = {
      "key": key,
      "rollType": rollType,
      "base": base,
      "skill": skill,
      "content": content,
      "appendDice": this.appendDice,
      "appendCritical": this.appendCritical,
      "actor": this.actor.id,
      "list": ""
    };
    for (let effect of effectList){ // space separate all ids
      diceOptions.list += effect.id + " "
    }

    console.log(diceOptions)

    //remove last space from end :)
    diceOptions.list = diceOptions.list.substring(0, diceOptions.list.length - 1);

    let returnval;

    if (this.return){
      diceOptions["return"] = true;
    }

    if (attackRoll != "-") {
      let confirm = async (weaponData) => {
        diceOptions["attack"] = {
          "value": weaponData.attack,
          "reaction": reaction_dice,
          "critical": reaction_crit,
          "type": attackRoll
        };
        if (!this.noRoll){
          returnval = await this.actor.rollDice(this.chatTitle, diceOptions, this.append);
        }
      }

      new WeaponDialog(this.actor, confirm).render(true);
    } else{
      if (!this.noRoll){
        returnval = await this.actor.rollDice(this.chatTitle, diceOptions, this.append);
      }
    }
      


    let getTarget = false;
    let appliedList = [];
    for (let e of effectList) {
      if (e.system.effect.disable != "-")
        appliedList.push(e);
      if (e.system.getTarget)
        getTarget = true;
    }

    if (!getTarget)
      Hooks.call("updateActorEncroach", this.actor, key, "target");
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
                  await e.applyTarget(a, false, false, false, this.actor);

                for (let e of macroList) {
                  const macro = game.macros.contents.find(m => (m.name === e.system.macro));
                  if (macro != undefined)
                      macro.execute();
                  else if (e.system.macro != "")
                      new Dialog({
                          title: "macro",
                          content: `Do not find this macro: ${e.system.macro}`,
                          buttons: {}
                      }).render(true);
                }
              }
              Hooks.call("updateActorEncroach", this.actor, key, "target");
            }
          }
        },
        close: () => {
          //Hooks.call("updateActorEncroach", this.actor, key, "target")
        }
      }, {top: 300, left: 20}).render(true);
    }
    
    return returnval;


  }


  /* -------------------------------------------- */

  _onShowItemDetails(event) {
    const toggler = $(event.currentTarget);
    if ($(event.target).hasClass("active-effect") || $(event.target).hasClass("echo-item"))
      return;

    event.preventDefault();
    const item = toggler.parents('.item');
    const description = item.find('.item-description');

    toggler.toggleClass('open');
    description.slideToggle();
  }

  /* -------------------------------------------- */

  _echoItemDescription(event) {
    event.preventDefault();
    const li = event.currentTarget.closest(".item");
    let item = this.actor.items.get(li.dataset.itemId);

    item.toMessage();
  }

  /* -------------------------------------------- */



}