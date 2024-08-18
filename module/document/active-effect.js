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
    } else if (this.statuses.has("link")){
      this._prepareLink()
    } else if (this.statuses.has("linked")){

    }
  }

  /** @Override */
  async _onCreate(data, options, userId){
    super._onCreate(data,options,userId);
    if ( this.statuses.has("hatred") ){
      this._prepareHatred();
    }
  }

  _prepareLink() {
    let actor = this.parent;
    if (this,flags.dx3rd && this.flags.dx3rd.link){
      

    } else { //if there is no link object then it's invalid
      this.delete()
    }
    
  }
  _prepareLinked() {
    let actor = this.parent;
  }

  _prepareTaint() {
    let level;
    if (this.flags.dx3rd && this.flags.dx3rd.taintLevel){
      level = this.flags.dx3rd.taintLevel
    } else {
      level = 1 
    }
    this.icon = `systems/dx3rd/icons/svg/taint-${level}.svg`;
    this.name = `${game.i18n.localize("DX3rd.Taint")} ${level}`;
    this.flags.dx3rd = this.flags.dx3rd || {}
    this.flags.dx3rd.taintLevel = level

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
    //check for ownership b4 rendering
    let arr;
    let actor = this.parent
    console.log(this)
    if (actor.hasPlayerOwner){
      arr = game.users.filter(u => actor.testUserPermission(u, CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER))
    } else {
      arr = game.users.filter(u => u.isGM).map(u => u.id)
    }
    if (game.user.id == arr[0]){ //only render for the first owner
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
                console.log('hatred target create')
                let a = target.actor
                let newEffect = {
                  id: "hatred_target",
                  name: `${game.i18n.localize("DX3rd.Hatred")} - ${game.i18n.localize("DX3rd.Target")}`,
                  icon: "icons/svg/target.svg",
                  statuses: "hatred_target"
                }
                a.createEmbeddedDocuments("ActiveEffect", [newEffect]) //add target status to actor
                console.log(a)
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
    
  }

  _clearTarget(){
    console.log("hatred delete")
    let target = this.getFlag("dx3rd", "target")
    console.log(target)
    if (target){
      let actor = game.actors.get(target)
      let hatred;
      for (let e of actor.effects){
        console.log(e)
        if (e.statuses.has("hatred_target")){
          hatred = e;
          break;
        }
      }
      console.log(hatred)
      if (hatred){
        hatred.delete(); //remove target status
      }
    }
  }

  /** @Override */
  async _onDelete(options, userid){
    if ( this.statuses.has("pressure") ){
      this._clearDisables("auto");
    } else if ( this.statuses.has("berserk") ){
      this._clearDisables("reaction");
    } else if ( this.statuses.has("hatred") ){
      this._clearTarget();
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