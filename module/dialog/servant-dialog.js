import { SelectItemsDialog } from "../dialog/select-items-dialog.js";

export class ServantDialog extends Dialog {
  constructor(actor, data, options) {
    super(options);
    
    this.actor = actor;
    this.data = {
      title: game.i18n.localize("DX3rd.DefenseDamage"),
      content: "",
      buttons: {
        confirm: {
          icon: '<i class="fas fa-check"></i>',
          label: "Confirm",
          callback: async () => {
            //create servant template
            let rs = this.getItemFromFlag(this.actor, "isRedServant")
            let rs_lvl = rs.system.level.value;
            let servant = {
              "name": $("#name").val(),
              "type": "servant",
              "img": $("#pfp").attr('src'),
              "system": {
                "attributes" : {
                  "body": {
                    "point": 3
                  },
                  "mind" : {
                    "point": 3
                  },
                  "sense": {
                    "point": 3
                  },
                  "social": {
                    "point": 3
                  },
                  "hp":{
                    "value": ((rs_lvl*5)+10)
                  },
                  "hp_val": ((rs_lvl*5)+10),
                  "encroachment": this.actor.system.attributes.encroachment
                },
                "summoner": this.actor.uuid
              }
            }
            if ($("#create-items").is(":checked")){
              let confirm = async (itemData) => {
                actor.createEmbeddedDocuments("Item", itemData)
              }
              let eff = this.getItemFromFlag(this.actor, "isFoolsEquipment")
              let data = this.getEmbeddedItems(eff)
              let a = new SelectItemsDialog(this.actor, data, eff.system.level.value, confirm).render(true)
            }
            if ($("#can-use-items").is(":checked")){
              servant.system.use_items = true;
            }
            if ($("#copy-target").is(":checked")){
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
                      let [target] = targets
                      console.log(target)
                      if (target){
                        servant.img = target.actor.img
                      }
                    }
                  }
                },
                close: () => {
                  //Hooks.call("updateActorEncroach", this.actor, this.id, "target")
                }
              }, {top: 300, left: 20}).render(true);
            }

            if ($("#increase-base").is(":checked")){
              let eff = this.getItemFromFlag(this.actor, "isRedRiverValet")
              let lvl = eff.system.level.value;
              servant.system.attributes.body.point += lvl;
              servant.system.attributes.mind.point += lvl;
              servant.system.attributes.sense.point += lvl;
              servant.system.attributes.social.point += lvl;
            }

            if ($("#increase-hp").is(":checked")){
              let eff = this.getItemFromFlag(this.actor, "isLifeBlood")
              let lvl = eff.system.level.value;
              servant.system.attributes.hp_val += (lvl * 5); //increase max
              servant.system.attributes.hp.value += (lvl * 5); //increase current
            }
            let servantList = this.actor.system.servants
            //actually create the servants
            let count = $("#amount").val()
            console.log(count)
            for (let i = 0; i < count; i++){
              let a = await Actor.create(servant);
              servantList.push(a.uuid)
            }

            //apply encroach
            let last = Number(this.actor.system.attributes.encroachment.value)
            let encroach = last + this.calcEncroach($("#amount").val() != 1, $("#copy-target").is(":checked") )

            //message
            let chatData = {
              speaker: ChatMessage.getSpeaker({actor: this.actor}),
              sound: CONFIG.sounds.notification,
              content : `<div class="context-box">${this.actor.name}: ${last} -> ${encroach} (+${encroach-last})</div>`
            };
            let rollMode = game.settings.get("core", "rollMode");
            ChatMessage.create(chatData, {rollMode});

            this.actor.update({"system.attributes.encroachment.value": encroach, "system.servants": servantList});
            
          }
        }
      },
      default: 'confirm'
    };
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
    
    html.find('input, select').on('change', this.calcVals.bind(this, html));
    html.find('#reset').on('click', this.reset.bind(this, html));
      
  }
  
  /** @override */
  getData() {
    /**
     * things to check for:
     * fools equipment: creates items on servatn on creation (instantiate selectitemsdialog)
     * the wise: allows servants to use normal items (preset flag on servant creation)
     * army of fools: increases amount that you can create at a time - KEEP IN MIND THIS, UNLIKE THE OTHERS, *DOES* INCREASE ENCROACH ON USE!!!
     * the voiceless: increases max amount
     * servants march: creates servants such that they will be able to act this turn in the turn order; CANNOT be combined with any of these other powers.
     * red river valet: increases all base stats by +LV from the default 3/3/3/3
     * life blood: increases max HP by +(LV*5)
     * undead's doll: copies target appearance - 1 encroach cost
     * uhhh i think thats all the things that affect creation??
     */
    //im so sorry for doing things this way
    let createItems = this.checkFlag(this.actor, "isFoolsEquipment");
    let canUseNormalItems= this.checkFlag(this.actor, "isTheWise");
    let creationMax = this.checkFlag(this.actor, "isArmyOfFools");
    let max = this.checkFlag(this.actor, "isTheVoiceless")
    let preActionCreate = this.checkFlag(this.actor, "isServantsMarch");
    let increaseBaseStats = this.checkFlag(this.actor, "isRedRiverValet");
    let increaseMaxHP = this.checkFlag(this.actor, "isLifeBlood");
    let copyTarget = this.checkFlag(this.actor, "isUndeadsDoll")

    let maxCheck = !!max
    max = max || 1;
    let creationCheck = !! creationMax;
    creationMax = creationMax || 1;

    
    
    let remaining = this.calcRemaining(this.actor, max, 0);
    let limit = this.calcLimit(creationCheck, creationMax, remaining)
    let encroach = this.calcEncroach(false, false)
    console.log(encroach)
    
    return {
      name: "New Servant",
      src: "icons/svg/mystery-man.svg",

      createItems: createItems,
      canUseNormalItems: canUseNormalItems,
      creationMax: creationMax,
      max: max,
      preActionCreate: preActionCreate,
      increaseBaseStats: increaseBaseStats,
      increaseMaxHP: increaseMaxHP,
      copyTarget: copyTarget,

      proj_encroach:encroach,
      remaining: remaining,
      amount: 0,
      limit: limit,
      maxCheck: maxCheck,
      creationCheck: creationCheck,


      buttons: this.data.buttons
    }
  }

  checkFlag(actor, flag){
    for (let e of actor.items){
      if (e.type == "effect"){
        if (e.system.flags.owned.find((obj) => obj.name == flag)){
          return e.system.level.value || 1;
        }
      }
    }
    return 0;
  }

  getItemFromFlag(actor, flag){ //similar to checkflag, but it returns the item itself
    for (let e of actor.items){
      if (e.type == "effect"){
        if (e.system.flags.owned.find((obj) => obj.name == flag)){
          return e;
        }
      }
    }
  }
 parseItemVals(str, level){
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
  getEmbeddedItems(item){
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
          add: this.parseItemVals(val.add, item.system.level.value),
          attack:this.parseItemVals(val.attack,item.system.level.value),
          guard: this.parseItemVals(val.guard,item.system.level.value),
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
          dodge: this.parseItemVals(val.dodge, item.system.level.value),
          armor: this.parseItemVals(val.armor, item.system.level.value),
          init: this.parseItemVals(val.init, item.system.level.value),
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
          attack: this.arseItemVals(val.attack,item.system.level.value),
          armor: this.parseItemVals(val.armor, item.system.level.value),
          init: this.parseItemVals(val.init, item.system.level.value),
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
    return itemList;
  }

  calcVals(html) {
    if ($("#create-ready").is(":checked")){
      $("#max").prop("checked", false);
      $("#creation-max").prop("checked", false);
      $("#create-items").prop("checked", false);
      $("#can-use-items").prop("checked", false);
      $("#increase-base").prop("checked", false);
      $("#increase-hp").prop("checked", false);
      $("#copy-target").prop("checked", false);
    }
    let remaining = this.calcRemaining(this.actor, $("#max").is(":checked"), $("#amount").val())
    console.log(remaining)
    let creationMax = this.checkFlag(this.actor, "isArmyOfFools");
    let limit = this.calcLimit($("#creation-max").is(":checked"), creationMax, remaining)
    console.log(limit)
    $("amount").attr({
      "max" : limit
    });
    if ($("#amount").val() > limit){
      $("#amount").val() = limit
    }
    let encroach = this.calcEncroach($("#amount").val() != 1, $("#copy-target").is(":checked") )

    $("#proj_encroach").text(encroach);
    $("#amount-disp").text($("#amount").val());
  }

  calcRemaining(actor, max, amount) {
    let currentServants = actor.system.servants.length;
    let num = max - currentServants - amount;
    if (num <= 0){
      return 0;
    }
    return num;
  }

  calcLimit(creationCheck, creationMax, remaining){
    if (creationCheck){
      return Math.min(creationMax, remaining)
    } else {
      return Math.min(1, remaining)
    }
  }

  calcEncroach(creationMax, copyTarget) {
    let encroach = 5; //base encroach of red servant
    if (creationMax){
      encroach += 5;
    }
    if (copyTarget){
      encroach += 1;
    }
    return encroach;
  }
  
  reset(html) {
    this.render(true);
  }

}
