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
      this._prepareLinked()
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
    if (this.flags.dx3rd && this.flags.dx3rd.targets){
      for (let a of targets){ //iterate over targets
        //grant them your powers
        let 
      }
      if (this.flags.dx3rd.type == "fusion"){ //do fusion specific things

      } else { //do redservant specific things
        //give user redservant effect
        let tmp = {
          id: "redservant",
          name: `${game.i18n.localize("DX3rd.RedServant")}`,
          statuses: "redservant"
        }
        actor.createEmbeddedDocuments("ActiveEffect", tmp)
      }
    } else { //if there is no link object then it's invalid
      this.delete()
    }
    
  }
  _prepareLinked() {
    let actor = this.parent;
    let origin = this.flags.dx3rd.origin;
    //add link status to parent if one does not exist - this should be able to handle the case of an actor being the linker for both redservant and fusion
    let linkStatus = this.getStatus(origin, "link")
    if (!linkStatus || (linkStatus.flags.dx3rd.type != this.flags.dx3rd.type)){
      let newEffect = {
        id: "link",
        name: `${game.i18n.localize("DX3rd.Link")} - `,
        icon: "icons/svg/ice_aura.svg",
        statuses: "link",
        flags: {dx3rd: {targets: [actor], type: this.flags.dx3rd.type}}
      }
      // formatting for link name
      if (this.flags.dx3rd.type == "fusion"){
        newEffect.name += `${game.i18n.localize("DX3rd.Fusion")}`
      } else {
        newEffect.name += `${game.i18n.localize("DX3rd.RedServant")}`
      }
      origin.createEmbeddedDocuments("ActiveEffect", newEffect)
    }
    //check to make sure the link is valid - we fetch again to make sure the link was successfully created (if needed)
    linkStatus = this.getStatus(origin, "link")
    if (linkStatus) {
      //refresh targets list on the linkers end
      if (linkStatus.flags.dx3rd.type == this.flags.dx3rd.type){
        if (type == "fusion"){ //fusion can only have 1 target at a time, so it should overwrite the previous target.
          if (linkStatus.flags.dx3rd.targets != [actor]){
            let tmp = getStatus(linkStatus.flags.dx3rd.targets[0])
            tmp.delete(); //delete status on the other target to avoid hanging refs
            linkStatus.flags.dx3rd.targets = [actor] //set to new value
          }
        } else { //red servant should have as many as possible
          linkStatus.flags.dx3rd.targets.push(actor)
        }
      }
    } else {
      this.delete(); //something failed in the link process so we prune the link this side in order to avoid hanging refs
    }
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

  static getStatus(actor, str){
    for (let i = 0; i < actor.appliedEffects.length; i++){
        if (actor.appliedEffects[i].statuses.has(str)){
            return actor.appliedEffects[i];
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