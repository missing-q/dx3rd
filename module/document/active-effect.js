export class DX3rdActiveEffect extends ActiveEffect {
    
    /** @inheritDoc */
  prepareDerivedData() {
    super.prepareDerivedData();
    if ( this.statuses.has("taint") ){
      this._prepareTaint();
    } else if (this.statuses.has("pressure")){
      this._prepareDisables("auto");
    } else if ( this.statuses.has("berserk") ){
      this._prepareDisables("reaction");
    } else if ( this.statuses.has("hatred") ){
      this._prepareHatred();
    }
  }

  _prepareTaint() {
    let level = this.getFlag("dx3rd", "taintLevel") || 1;
    this.icon = `systems/dx3rd/icons/svg/taint-${level}.svg`;
    this.name = `${game.i18n.localize("DX3rd.Taint")} ${level}`;
    this.setFlag("dx3rd", "taintLevel", level)

  }

  _prepareDisables(timing){
    let actor = this.parent
    for (let e of actor.items){
      if (e.type == "effect"){
        console.log(e)
        if (e.system.timing == timing){
          e.update({"system.disabled": true})
        }
      }
    }
  }

  _clearDisables(timing){
    let actor = this.parent
    for (let e of actor.items){
      if (e.type == "effect"){
        if (e.system.timing == timing){
          if (e.system.uses.active){
            if (e.system.uses.current > 0){
              e.update({"system.disabled": false})
            }
          } else {
            e.update({"system.disabled": false})
          }
        }
      }
    }
  }

  _prepareHatred(){
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
            let target = game.user.targets[0];
            if (target){
              let a = target.actor
              let newEffect = {
                id: "hatred_target",
                name: `${game.i18n.localize("DX3rd.Hatred")} - ${game.i18n.localize("DX3rd.Target")}`,
                icon: "systems/dx3rd/icons/svg/target.svg"
              }
              a.createEmbeddedDocuments("ActiveEffect", [newEffect]) //add target status to actor
              //update this effect's name
              this.name = `${game.i18n.localize("DX3rd.Hatred")} - ${a.name}`;
              this.setFlag("dx3rd", "target", a.id)
            }
          }
        }
      },
      close: () => {
        //Hooks.call("updateActorEncroach", this.actor, this.id, "target")
      }
    }, {top: 300, left: 20}).render(true);
  }

  /** @Override */
  async _onDelete(options, userid){
    if (this.statuses.has("pressure")){
      this._clearDisables("auto");
    } else if ( this.statuses.has("berserk") ){
      this._clearDisables("reaction");
    }
    super._onDelete(options, userid);
  }

  static registerHUDListeners() {
    document.addEventListener("click", this.onClickTokenHUD.bind(this), { capture: true });
    document.addEventListener("contextmenu", this.onClickTokenHUD.bind(this), { capture: true });
  }

  static onClickTokenHUD(event) {
    const { target } = event;
    if ( !target.classList?.contains("effect-control") || (target.dataset?.statusId !== "taint") ) return;
    const actor = canvas.hud.token.object?.actor;
    //console.log(":D")
    let taint; 
    let i;
    for (i = 0; i < actor.appliedEffects.length; i++){
      if (actor.appliedEffects[i].statuses.has("taint")){
        taint = actor.appliedEffects[i];
        break;
      }
    }

    let level = taint.flags.dx3rd.taintLevel || 0
    if ( !Number.isFinite(level) ) return;
    event.preventDefault();
    event.stopPropagation();
    if ( event.button == 0 ){
      level++;
    }
    else{
      level--;
    } 

    if (level <= 0){
      taint.delete(); 
    } else {
      taint.setFlag("dx3rd", "taintLevel", level)
    }

    

    
  }

  _onUpdate(data, options, userId) {
    super._onUpdate(data, options, userId);
    console.log("hello!!")
    console.log(data)
    console.log(options)

    this._displayScrollingStatus(data.flags.dx3rd.taintLevel);

  }


}