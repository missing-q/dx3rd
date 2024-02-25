import { SelectItemsDialog } from "./dialog/select-items-dialog.js";

export class ServantDialog extends Dialog {
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

            //after guard hooks timer
            if (this.damageData.data.guard == "true"){
              Hooks.call("afterGuard", this.actor);
            }
            
            
            await this.actor.update({"system.attributes.hp.value": life});
            let chatData = {"content": this.actor.name + " (" + realDamage + ")", "speaker": ChatMessage.getSpeaker({ actor: this.actor })};
            ChatMessage.create(chatData);
            //TODO: attack deals damage event
            console.log(realDamage)
            if (realDamage < 0){
              console.log(this.damageData)
              let list = this.damageData.data.list
              console.log(list)
              //error handling for undefined list yay!
              if (list){
                list = list.split(" ")
              } else {
                list = []
              }

              for (let item of list){
                let e = game.actors.get(this.damageData.data.origin).items.get(item)
                console.log(e.name)
                e.applyTarget(this.actor,this.actor==this.damageData.data.origin,false,true)
              }
            }
          }
        }
      },
      default: 'confirm'
    };

    game.DX3rdServantDialog.push(this);
  }
  
  /** @override */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      template: "systems/dx3rd/templates/dialog/servant-dialog.html",
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
    /**
     * things to check for:
     * fools equipment: creates items on servatn on creation (instantiate selectitemsdialog)
     * the wise: allows servants to use normal items (preset flag on servant creation)
     * army of fools: increases amount that you can create at a time
     * the voiceless: increases max amount
     * servants march: creates servants such that they will be able to act this turn in the turn order; CANNOT be combined with any of these other powers.
     * red river valet: increases all base stats by +LV from the default 3/3/3/3
     * life blood: increases max HP by +(LV*5)
     * uhhh i think thats all the things that affect creation??
     */
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

  checkFlag(actor, flag){
    for (let e of actor.items){
      if (e.system.flags.owned.includes(flag)){
        return true;
      }
    }
    return false;
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
