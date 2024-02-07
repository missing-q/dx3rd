export class DX3rdActiveEffect extends ActiveEffect {
    
    /** @inheritDoc */
  prepareDerivedData() {
    super.prepareDerivedData();
    if ( this.statuses.has("taint") ){
      this._prepareTaintLevel();
    }
  }

  _prepareTaintLevel() {
    let level = this.getFlag("dx3rd", "taintLevel") || 1;
    this.icon = `systems/dx3rd/icons/svg/taint-${level}.svg`;
    this.name = `${game.i18n.localize("DX3rd.Taint")} ${level}`;
    if (!this.flags.dx3rd){
      this.flags.dx3rd = {}
    }
    this.flags.dx3rd.taintLevel = level;

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