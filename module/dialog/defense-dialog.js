
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
            if (isGuard){
              console.log("guarding!")
              //doGuard();
            } else {
              console.log("dodging!")
              //doDodge(this.reactionData);
              const diceOptions = {
                "rollType": "dodge",
                "base": "body",
                "skill": "dodge",
                "appendDice": this.reactionData.reaction,
                "appendCritical": this.reactionData.critical,
                "return": true
              };
              console.log(this.reactionData)
              let result = await actor.rollDice("Dodge", diceOptions)
              console.log(result)
              if (result > this.reactionData.roll ){
                //dodged!
                console.log("yay!")
              } else {
                //dodge unsuccessful
                console.log("oh no :(")
              }
            }
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
