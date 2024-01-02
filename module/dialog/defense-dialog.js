
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
            let chatData = { "speaker": ChatMessage.getSpeaker({ actor: this.actor }), "sound":CONFIG.sounds.notification}
            if (isGuard){
              //console.log("guarding!")
              chatData.content = `<div class="context-box"> <button class="chat-btn apply-damage" data-damage="${damageData.damage}" data-ignore-armor="${damageData.ignoreArmor}" data-guard="${true}">${game.i18n.localize("DX3rd.ApplyDamage")}</button> </div>`
              //TODO: call "attack hits" event
            } else {
              console.log("dodging!")
              const diceOptions = {
                "rollType": "dodge",
                "base": "body",
                "skill": "dodge",
                "appendDice": this.reactionData.reaction,
                "appendCritical": this.reactionData.critical,
                "return": true
              };
              //console.log(this.reactionData)
              let result = await actor.rollDice("Dodge", diceOptions)
              //console.log(result)
              if (result > this.reactionData.roll ){
                //dodged!
                chatData.content = `<div class="context-box"> ${actor.name} dodged! </div>`
                //console.log("yay!")
              } else {
                //dodge unsuccessful
                //console.log("oh no :(")
                chatData.content = `<div class="context-box"> <button class="chat-btn apply-damage" data-damage="${damageData.damage}" data-ignore-armor="${damageData.ignoreArmor}" data-guard="${false}">${game.i18n.localize("DX3rd.ApplyDamage")}</button> </div>`
                //TODO: call "attack hits" event
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
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      template: "systems/dx3rd/templates/dialog/defense-dialog.html",
      classes: ["dx3rd", "dialog"],
      width: 400
    });
  }

}
