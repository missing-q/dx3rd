
import { WeaponDialog } from "./weapon-dialog.js";

export class ComboDialog extends Dialog {

  constructor(actor, title, diceOptions, append, options) {
    super(options);

    this.actor = actor;

    this.chatTitle = game.i18n.localize("DX3rd.Combo") + ": " + title; 
    this.skillId = diceOptions.skill;
    this.base = diceOptions.base;

    if (this.skillId != null)
      this.skill = actor.system.attributes.skills[this.skillId];
    else
      this.skill = "-";

    this.append = append;

    this.data = {
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

  /** @override */
  getData() {
    let actorSkills = duplicate(this.actor.system.attributes.skills);
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
      actorSkills: actorSkills
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

    await $(".active-effect").each(async (i, val) => {
      if ($(val).is(":checked")) {
        let effect = this.actor.items.get(val.dataset.id);
        effectList.push(effect);
        
        if ( Number.isNaN(Number(effect.system.encroach.value)) )
          encroachStr.push(effect.system.encroach.value);
        else
          encroach += Number(effect.system.encroach.value);

        let updates = {};
        if (effect.system.active.disable != '-')
            updates["system.active.state"] = true;
        await effect.update(updates);
      }
    });

    if (encroachStr.length > 0)
        encroach += "+" + encroachStr.join("+");

    for (let effect of effectList) {
      if (effect.system.disabled)
        continue;
      actor.items.forEach(f => {
        if ((f.type == "effect") && (f.system.active.state) && (f.system.checkSyndrome) && (effect.system.syndrome == f.system.syndrome) && (effect != f)){
          console.log("yay match :)")
          f.applyTarget(actor, true)
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

    const diceOptions = {
      "key": key,
      "rollType": rollType,
      "base": base,
      "skill": skill,
      "content": content
    };

    if (attackRoll != "-") {
      let confirm = async (weaponData) => {
        diceOptions["attack"] = {
          "value": weaponData.attack,
          "type": attackRoll
        };

        await this.actor.rollDice(this.chatTitle, diceOptions, this.append);
      }

      new WeaponDialog(this.actor, confirm).render(true);
    } else
      await this.actor.rollDice(this.chatTitle, diceOptions, this.append);


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
                  await e.applyTarget(a);

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