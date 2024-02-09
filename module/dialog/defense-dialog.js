import { ComboDialog } from "../dialog/combo-dialog.js";

export class DefenseDialog extends Dialog {
  constructor(actor, data, options) {
    super(options);
    
    this.actor = actor;
    this.reactionData = data;

    this.data = {
      title: game.i18n.localize("DX3rd.DefenseDamage"),
      content: "",
      buttons: {
        confirm: {
          icon: '<i class="fas fa-check"></i>',
          label: "Confirm",
          callback: async () => {
            let isGuard = $("#guard").is(":checked")
            let damageData = this.reactionData.damageData
            console.log(this.reactionData)
            let diceOptions = {
              "base": null,
              "skill": null,
              "noRoll": true
            };
            //get original combo or effects this originated from
            //console.log(this.reactionData.actor)
            //console.log(this.reactionData.id)
            let list = this.reactionData.list
            //error handling for undefined list yay!
            if (list){
              list = list.split(" ")
            } else {
              list = []
            }
            let chatData = { "speaker": ChatMessage.getSpeaker({ actor: this.actor }), "sound":CONFIG.sounds.notification}
            if (isGuard){
              //console.log("guarding!")
              //normal, nice simple combo dialog
              await Dialog.confirm({
                title: game.i18n.localize("DX3rd.Combo"),
                content: "",
                yes: async () => ComboDialog.wait(actor, game.i18n.localize("DX3rd.Guard"), diceOptions, false),
                defaultYes: false
              });
              chatData.content = `<div class="context-box"> <button class="chat-btn apply-damage" data-damage="${damageData.damage}" data-ignore-armor="${damageData.ignoreArmor}" data-guard="${true}" data-actor="${this.reactionData.actor}" data-id ="${this.reactionData.id}" data-list ="${this.reactionData.list}" >${game.i18n.localize("DX3rd.ApplyDamage")}</button> </div>`
              //TODO: call "attack hits" event
              for (let item of list){
                let e = game.actors.get(this.reactionData.actor).items.get(item)
                console.log(e.name)
                e.applyTarget(this.actor,this.actor==this.reactionData.actor,true,false)
              }

            } else {
              console.log("dodging!")
               diceOptions = {
                "rollType": "dodge",
                "base": "body",
                "skill": "dodge",
                "appendDice": this.reactionData.reaction,
                "appendCritical": this.reactionData.critical,
                "return": true
              };

              const result = await Dialog.confirm({
                title: game.i18n.localize("DX3rd.Combo"),
                content: "",
                yes: () => ComboDialog.wait(actor, game.i18n.localize("DX3rd.Dodge"), diceOptions, false),
                no: () => actor.rollDice(game.i18n.localize("DX3rd.Dodge"), diceOptions),
                defaultYes: false
              });

              //console.log(this.reactionData)
              console.log(result)
              if (result > this.reactionData.roll ){
                //dodged!
                chatData.content = `<div class="context-box"> ${actor.name} dodged! </div>`
                console.log("yay!")
              } else {
                //dodge unsuccessful
                console.log("oh no :(")
                chatData.content = `<div class="context-box"> <button class="chat-btn apply-damage" data-damage="${damageData.damage}" data-ignore-armor="${damageData.ignoreArmor}" data-guard="${false}" data-actor="${this.reactionData.actor}" data-id ="${this.reactionData.id}" data-list ="${this.reactionData.list}" >${game.i18n.localize("DX3rd.ApplyDamage")}</button> </div>`
                //TODO: call "attack hits" event

                for (let item of list){
                  let e = game.actors.get(this.reactionData.actor).items.get(item)
                  console.log(e.name)
                  e.applyTarget(this.actor,this.actor==this.reactionData.actor,true,false)
                }
                
              }
            }
            ChatMessage.create(chatData);

          }
        }
      },
      default: 'confirm'
    };
  }
  
  /** @override */
  getData() {
    //check if defending actor has berserk, if so then disable reaction
    let berserk = false;
    for (let e of this.actor.effects){
      if (e.statuses.has("berserk")){
        berserk = true;
        break;
      }
    }
    return {
      berserk: berserk,
      name: this.actor.name,
      src: this.actor.img,
      buttons: this.data.buttons
    }
  }
  /** @override */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      template: "systems/dx3rd/templates/dialog/defense-dialog.html",
      classes: ["dx3rd", "dialog"],
      width: 400
    });
  }

}
