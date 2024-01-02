
export class DamageDialog extends Dialog {
  constructor(actor, data, options) {
    super(options);
    
    this.actor = actor;
    this.damageData = data;

    this.data = {
      title: game.i18n.localize("DX3rd.DefenseDamage"),
      content: "",
      buttons: {
        confirm: {
          icon: '<i class="fas fa-check"></i>',
          label: "Confirm",
          callback: async () => {
            let defense = this.getDefense();
            let {life, realDamage} = this.calcDefenseDamage(defense);
        
            //Hooks.call("afterReaction", this.actor);
            
            await this.actor.update({"system.attributes.hp.value": life});
            let chatData = {"content": this.actor.name + " (" + realDamage + ")", "speaker": ChatMessage.getSpeaker({ actor: this.actor })};
            ChatMessage.create(chatData);
            //TODO: attack deals damage event
            if (realDamage > 1){

            }
          }
        }
      },
      default: 'confirm'
    };

    game.DX3rd.DamageDialog.push(this);
  }
  
  /** @override */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      template: "systems/dx3rd/templates/dialog/damage-dialog.html",
      classes: ["dx3rd", "dialog"],
      width: 400
    });
  }
  
  /** @override */
  activateListeners(html) {
    super.activateListeners(html);
    
    html.find('input, select').on('change', this.calcLife.bind(this, html));
    html.find('#reset').on('click', this.reset.bind(this, html));
      
  }
  
  /** @override */
  getData() {
    let weaponList = [];

    for (let i of this.actor.items) {
      let item = i;

      if (i.type == 'weapon')
        weaponList.push(item);
    }

    let defense = {
      armor: Number(this.actor.system.attributes.armor.value),
      guard: Number(this.actor.system.attributes.guard.value),
      reduce: 0,
      double: false,
      guardCheck: this.damageData.data.guard == "true" || false
    }
    console.log(this.damageData)
    console.log(defense)
    
    let {life, realDamage} = this.calcDefenseDamage(defense);
    
    return {
      name: this.actor.name,
      src: this.actor.img,
      life: life,
      realDamage: realDamage,
      damage: "-" + this.damageData.realDamage,
      armor: defense.armor,
      guard: defense.guard,
      guardCheck: defense.guardCheck,
      weaponList: weaponList,
      reduce: defense.reduce,
      double: (defense.double) ? "checked" : "",
      buttons: this.data.buttons
    }
  }
  
  getDefense() {
    let defense = {};
    defense.double = $("#double").is(":checked");
    defense.guardCheck = $("#guard-check").is(":checked");

    defense.armor = ($("#armor").val() == "") ? 0 : +$("#armor").val();
    defense.guard = ($("#guard").val() == "") ? 0 : +$("#guard").val();
    defense.reduce = ($("#reduce").val() == "") ? 0 : +$("#reduce").val();

    let weapon = Number($("#weapon option:selected").data("guard"));
    if (defense.guardCheck)
      defense.guard += weapon;
    
    return defense;
  }
  
  calcLife(html) {
    let defense = this.getDefense();
    let {life, realDamage} = this.calcDefenseDamage(defense);

    $("#realDamage").text(realDamage);
    $("#life").text(life);
  }
  
  reset(html) {
    this.render(true);
  }

  calcDefenseDamage(def) {
    let defense = duplicate(def);
    let actorData = this.actor.system;

    if (this.damageData.data.ignoreArmor)
      defense.armor = 0;

    let realDamage = this.damageData.realDamage;
    let life = actorData.attributes.hp.value;
    let maxLife = actorData.attributes.hp.max;

    realDamage -= defense.armor;
    if (defense.guardCheck)
      realDamage -= defense.guard;

    if (defense.double)
      realDamage *= 2;

    realDamage -= defense.reduce;
    realDamage = (realDamage < 0) ? 0 : realDamage;
    
    life = (life - realDamage < 0) ? 0 : life - realDamage;
    realDamage = "-" + realDamage;

    return {
      life,
      realDamage
    }

  }

}
