
export class DX3rdItem extends Item {

  prepareData() {
    super.prepareData();
    this._prepareItem();
  }
  _prepareItem(){
    let attrs = this.system
    //add or replace applied values
    if (attrs.applied){
      let overwrites = {};
      for (let [k,v] of Object.entries(attrs.applied)){
        for (let [key, value] of Object.entries(v)){
          if (value.key in attrs){
            if (value.key == "range" || "timing"){
              //timing is an overwrite every time since you can't "add" range
              if (overwrites[value.key]){
                overwrites[value.key].push(value.value)
              } else {
                overwrites[value.key] = [value.value]
              }
            } else {
              if (value.overwrite){
                //either create an array with the value in it, or push if it already exists
                if (overwrites[value.key]){
                  overwrites[value.key].push(value.value)
                } else {
                  overwrites[value.key] = [value.value]
                }
                //console.log(overwrites)
              } else {
                attrs[value.key] += value.value;
              }
            }
          }
        }
      }
      if (overwrites){
        for (let [key,value] of Object.entries(overwrites)){
          let newval;
          if (key in attrs){
            if (key == "range"){
              let max = 0;
              let tmp = []
              for (let i = 0; i < value.length; i ++ ){
                if (value[i] == "View"){
                  tmp[i] = 99
                } else if (value[i] == "Close"){
                  tmp[i] = 0;
                } else {
                  tmp[i] = Number.parseInt(i)
                }
              }
              max = Math.max(...tmp)
              if (max == 99){
                newval = "View"
              } else if (max == 0){
                newval = "Close"
              } else {
                newval = `${max}m`
              }
            } else if (key == "timing"){
              //'use','roll','major', 'reaction', 'turn', 'round', 'battle', 'session', 'guard
              let tmp = []
              let timings = ['use','roll','major', 'reaction', 'turn', 'round', 'battle', 'session', 'guard']
              for (let i = 0; i < value.length; i ++ ){
                tmp[i] = timings.indexOf(value[i])
              }
              let max = Math.min(...tmp)
              newval = timings[max]
            } else {
              newval = Math.max(...value)
            }
            //apply overwritten value
            if (key == "timing"){ //specific handling for overwriting timing. the timing attribute refers to in-turn timing, we want to overwrite the disabletiming
              attrs.active.disable = newval;
            } else {
              attrs[key] = newval;
            }
          }
        }
      }
    }
  }

  async toMessage() {
    let title = `<div class="title">${this.name}</div>`;
    title = `<img src="${this.img}" width="30" height="30">&nbsp&nbsp${title}`; 
    
    let content = `<div class="dx3rd-item-info" data-actor-id=${this.actor.id} data-item-id=${this.id}><h2 class="header">${title}</h2>`

    if (this.type == "effect")
      content += await this._getEffectContent();
    else if (this.type == "combo")
      content += await this._getComboContent();

    else if (this.type == "weapon")
      content += await this._getWeaponContent();
    else if (this.type == "protect")
      content += await this._getProtectContent();
    else if (this.type == "vehicle")
      content += await this._getVehicleContent();
    else if (this.type == "connection")
      content += await this._getConnectionContent();
    else if (this.type == "item")
      content += await this._getItemContent();

    else if (this.type == "rois")
      content += await this._getRoisContent();

    content += `</div>`


    // GM rolls.
    let chatData = {
      user: game.user.id,
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content: content
    };

    await ChatMessage.create(chatData);
  }

  async _getEffectContent() {
    let content = `
      <table>
        <tr>
          <td colspan="2"><b>${game.i18n.localize("DX3rd.Level")}:&nbsp&nbsp</b>
          ${this.system.level.value} / ${this.system.level.max}</td>
        </tr>
        <tr>
          <td colspan="2"><b>${game.i18n.localize("DX3rd.Timing")}:&nbsp&nbsp</b>
          ${ Handlebars.compile('{{timing arg}}')({arg: this.system.timing}) }</td>
        </tr>
        <tr>
          <td colspan="2"><b>${game.i18n.localize("DX3rd.Skill")}:&nbsp&nbsp</b>
          ${ Handlebars.compile('{{skillByKey actor key}}')({actor: this.actor, key: this.system.skill}) }</td>
        </tr>
        <tr>
          <td colspan="2"><b>${game.i18n.localize("DX3rd.Difficulty")}:&nbsp&nbsp</b>
          ${this.system.difficulty}</td>
        </tr>

        <tr>
          <td><b>${game.i18n.localize("DX3rd.Target")}:&nbsp&nbsp</b>${this.system.target}</td>
          <td><b>${game.i18n.localize("DX3rd.Range")}:&nbsp&nbsp</b>${this.system.range}</td>
        </tr>
        <tr>
          <td><b>${game.i18n.localize("DX3rd.Encroach")}:&nbsp&nbsp</b>${this.system.encroach.value}</td>
          <td><b>${game.i18n.localize("DX3rd.Limit")}:&nbsp&nbsp</b>${this.system.limit}</td>
        </tr>
    `
    if (this.system.uses.active){
      content += 
      `
      <tr>
      <td colspan="2"><b>${game.i18n.localize("DX3rd.Uses")}:&nbsp&nbsp</b>
      ${this.system.uses.current} / ${this.system.uses.max}</td>
      </tr>
      `
    }
    content += `
    </table>
      <p>${this.system.description}</p>
      <button class="chat-btn use-effect">${game.i18n.localize("DX3rd.Use")}</button>
    `
    return content;
  }

  async _getComboContent() {
    //console.log(this)
    let content = `
      <table>
        <tr>
          <td><b>${game.i18n.localize("DX3rd.Timing")}:&nbsp&nbsp</b>
          ${ Handlebars.compile('{{timing arg}}')({arg: this.system.timing}) }</td>
          <td><b>${game.i18n.localize("DX3rd.Limit")}:&nbsp&nbsp</b>${this.system.limit}</td>
        </tr>
        <tr>
          <td><b>${game.i18n.localize("DX3rd.Skill")}:&nbsp&nbsp</b>
          ${ Handlebars.compile('{{skillByKey actor key}}')({actor: this.actor, key: this.system.skill}) }</td>
          <td><b>${game.i18n.localize("DX3rd.Difficulty")}:&nbsp&nbsp</b>
          ${this.system.difficulty}</td>
        </tr>
        <tr>
          <td><b>${game.i18n.localize("DX3rd.Target")}:&nbsp&nbsp</b>${this.system.target}</td>
          <td><b>${game.i18n.localize("DX3rd.Range")}:&nbsp&nbsp</b>${this.system.range}</td>
        </tr>
        <tr>
          <td><b>${game.i18n.localize("DX3rd.Attack")}:&nbsp&nbsp</b>${this.system.attack.value}</td>
          <td><b>${game.i18n.localize("DX3rd.Critical")}:&nbsp&nbsp</b>${this.system.critical.value}</td>
        </tr>
        <tr>
          <td><b>${game.i18n.localize("DX3rd.Dice")}:&nbsp&nbsp</b>${this.system.dice.value}</td>        
          <td><b>${game.i18n.localize("DX3rd.Encroach")}:&nbsp&nbsp</b>${this.system.encroach.value}</td>

        </tr>
      </table>
      <p>${this.system.description}</p>
      <button class="chat-btn toggle-btn" data-style="effect-list">${game.i18n.localize("DX3rd.Effect")}</button>
      <div class="effect-list">`;

    for (let [key, e] of Object.entries(this.system.effectItems)) {
      content += `
        <div>
          <h4 class="item-name toggle-btn 
      `;
      if (e.system.disabled){
        content += `disabled" data-style="item-description">`
      }
      else {
        content += `" data-style="item-description">`
      }
      if (e.img != "icons/svg/item-bag.svg"){
        content += `<img src="${e.img}" width="20" height="20" style="vertical-align : middle;margin-right:8px;">`;
      }
      //console.log(e)

      content += `<span class="item-label">[${e.system.level.value}] ${e.name}<br>
              <span style="color : gray; font-size : smaller;">
                ${game.i18n.localize("DX3rd.Timing")} : ${ Handlebars.compile('{{timing arg}}')({arg: e.system.timing}) } / 
                ${game.i18n.localize("DX3rd.Skill")} : ${ Handlebars.compile('{{skillByKey actor key}}')({actor: this.actor, key: e.system.skill}) } / 
                ${game.i18n.localize("DX3rd.Target")} : ${e.system.target} / 
                ${game.i18n.localize("DX3rd.Range")} : ${e.system.range} /
                ${game.i18n.localize("DX3rd.Encroach")} : ${e.system.encroach.value} /
                ${game.i18n.localize("DX3rd.Limit")} : ${e.system.limit}
                <span class="item-details-toggle"><i class="fas fa-chevron-down"></i></span>
              </span>
            </span>
          </h4>
          <div class="item-description">${e.system.description}</div>
        </div>
        `;
        
    }
    content += `</div>`;

    if (this.system.attackRoll != "-" && !this.system.weaponSelect) {
      content += `<button class="chat-btn toggle-btn" data-style="weapon-list">${game.i18n.localize("DX3rd.Weapon")}</button>
                    <div class="weapon-list">`;
      for (let [key, e] of Object.entries(this.system.weaponItems)) {
        content += `
          <div>
            <h4 class="item-name toggle-btn" data-style="item-description">`;
        if (e.img != "icons/svg/item-bag.svg")  
          content += `<img src="${e.img}" width="20" height="20" style="vertical-align : middle;margin-right:8px;">`;

        content += `<span class="item-label">${e.name}<br>
                <span style="color : gray; font-size : smaller;">
                  ${game.i18n.localize("DX3rd.Timing")} : ${ Handlebars.compile('{{timing arg}}')({arg: e.system.type}) } / 
                  ${game.i18n.localize("DX3rd.Skill")} : ${ Handlebars.compile('{{skillByKey actor key}}')({actor: this.actor, key: e.system.skill}) } / 
                  ${game.i18n.localize("DX3rd.Attack")} : ${e.system.attack}
                  <span class="item-details-toggle"><i class="fas fa-chevron-down"></i></span>
                </span>
              </span>
            </h4>
            <div class="item-description">${e.description}</div>
          </div>
          `;
      }
      content += `</div>`;
    }

    content += `<button class="chat-btn use-combo">${game.i18n.localize("DX3rd.Use")}</button>`;

    return content;
  }


  async _getRoisContent() {
    let typeName = "";
    if (this.system.type == "D")
      typeName = game.i18n.localize("DX3rd.Descripted")
    else if (this.system.type == "S")
      typeName = game.i18n.localize("DX3rd.Superier")
    else if (this.system.type == "M")
      typeName = game.i18n.localize("DX3rd.Memory")
    else if (this.system.type == "E")
      typeName = game.i18n.localize("DX3rd.Exhaust")

    let statList = ["titus", "sublimation"]
    let state = {};
    for (let s of statList)
      state[s] = (this.system[s]) ? "O" : "X";

    state.positive = (this.system.positive.state) ? "O" : "X";
    state.negative = (this.system.negative.state) ? "O" : "X";

    let content = `
      <table>
        <tr>
          <td colspan="2"><b>${game.i18n.localize("DX3rd.Type")}:&nbsp&nbsp</b>
          ${typeName}</td>
        </tr>
        <tr>
          <td><b>${game.i18n.localize("DX3rd.Positive")} [${state.positive}]:&nbsp&nbsp</b>
          ${this.system.positive.feeling}</td>
          <td><b>${game.i18n.localize("DX3rd.Negative")} [${state.negative}]:&nbsp&nbsp</b>
          ${this.system.negative.feeling}</td>
        </tr>
        <tr>
          <td><b>${game.i18n.localize("DX3rd.Titus")}:&nbsp&nbsp</b>
          ${state.titus}</td>
          <td><b>${game.i18n.localize("DX3rd.Sublimation")}:&nbsp&nbsp</b>
          ${state.sublimation}</td>
        </tr>
      </table>
      <p>${this.system.description}</p>

    `

    if (!this.system.titus && !this.system.sublimation)
      content += `<button class="chat-btn titus">${game.i18n.localize("DX3rd.Titus")}</button>`;
    else if (this.system.titus && !this.system.sublimation)
      content += `<button class="chat-btn sublimation">${game.i18n.localize("DX3rd.Sublimation")}</button>`;

    return content;
  }


  async _getWeaponContent() {
    let content = `
      <table>
        <tr>
          <td colspan="2"><b>${game.i18n.localize("DX3rd.EquipType")}:&nbsp&nbsp</b>
          ${ Handlebars.compile('{{timing key}}')({key: this.system.type}) }</td>
        </tr>
        <tr>
          <td><b>${game.i18n.localize("DX3rd.Skill")}:&nbsp&nbsp</b>
          ${ Handlebars.compile('{{skillByKey actor key}}')({actor: this.actor, key: this.system.skill}) }</td>
          <td><b>${game.i18n.localize("DX3rd.Add")}:&nbsp&nbsp</b>
          ${this.system.add}</td>
        </tr>
        <tr>
          <td colspan="2"><b>${game.i18n.localize("DX3rd.Attack")}:&nbsp&nbsp</b>${this.system.attack}</td>
        </tr>
        <tr>
          <td><b>${game.i18n.localize("DX3rd.Guard")}:&nbsp&nbsp</b>
          ${this.system.guard}</td>
          <td><b>${game.i18n.localize("DX3rd.Range")}:&nbsp&nbsp</b>
          ${this.system.range}</td>
        </tr>
        <tr>
          <td><b>${game.i18n.localize("DX3rd.SellSaving")}:&nbsp&nbsp</b>
          ${this.system.saving.difficulty} / ${this.system.saving.value}</td>
          <td><b>${game.i18n.localize("DX3rd.EXP")}:&nbsp&nbsp</b>
          ${this.system.exp}</td>
        </tr>
      </table>
      <p>${this.system.description}</p>
      <button class="chat-btn roll-attack">${game.i18n.localize("DX3rd.AttackRoll")}</button>
    `

    return content;
  }

  async _getProtectContent() {
    let content = `
      <table>
        <tr>
          <td colspan="2"><b>${game.i18n.localize("DX3rd.EquipType")}:&nbsp&nbsp</b>
          ${ game.i18n.localize("DX3rd.Protect") }</td>
        </tr>
        <tr>
          <td><b>${game.i18n.localize("DX3rd.Dodge")}:&nbsp&nbsp</b>
          ${this.system.dodge}</td>
          <td><b>${game.i18n.localize("DX3rd.Init")}:&nbsp&nbsp</b>
          ${this.system.init}</td>
        </tr>
        <tr>
          <td colspan="2"><b>${game.i18n.localize("DX3rd.Armor")}:&nbsp&nbsp</b>${this.system.armor}</td>
        </tr>
        <tr>
          <td><b>${game.i18n.localize("DX3rd.SellSaving")}:&nbsp&nbsp</b>
          ${this.system.saving.difficulty} / ${this.system.saving.value}</td>
          <td><b>${game.i18n.localize("DX3rd.EXP")}:&nbsp&nbsp</b>
          ${this.system.exp}</td>
        </tr>
      </table>
      <p>${this.system.description}</p>

    `

    return content;
  }

  async _getVehicleContent() {
    let content = `
      <table>
        <tr>
          <td colspan="2"><b>${game.i18n.localize("DX3rd.EquipType")}:&nbsp&nbsp</b>
          ${ game.i18n.localize("DX3rd.Vehicle") }</td>
        </tr>
        <tr>
          <td colspan="2"><b>${game.i18n.localize("DX3rd.Skill")}:&nbsp&nbsp</b>
          ${ Handlebars.compile('{{skillByKey actor key}}')({actor: this.actor, key: this.system.skill}) }</td>
        </tr>
        <tr>
          <td><b>${game.i18n.localize("DX3rd.SellSaving")}:&nbsp&nbsp</b>
          ${this.system.saving.difficulty} / ${this.system.saving.value}</td>
          <td><b>${game.i18n.localize("DX3rd.EXP")}:&nbsp&nbsp</b>
          ${this.system.exp}</td>
        </tr>
      </table>
      <p>${this.system.description}</p>
      <table>
        <tr>
          <td><b>${game.i18n.localize("DX3rd.Attack")}:&nbsp&nbsp</b>
          ${this.system.attack}</td>
          <td><b>${game.i18n.localize("DX3rd.Init")}:&nbsp&nbsp</b>
          ${this.system.init}</td>
        </tr>
        <tr>
          <td><b>${game.i18n.localize("DX3rd.Armor")}:&nbsp&nbsp</b>
          ${this.system.armor}</td>
          <td><b>${game.i18n.localize("DX3rd.Move")}:&nbsp&nbsp</b>
          ${this.system.move}</td>
        </tr>
      </table>
      <button class="chat-btn roll-attack">${game.i18n.localize("DX3rd.AttackRoll")}</button>

    `

    return content;
  }

  async _getConnectionContent() {
    let content = `
      <table>
        <tr>
          <td colspan="2"><b>${game.i18n.localize("DX3rd.EquipType")}:&nbsp&nbsp</b>
          ${ game.i18n.localize("DX3rd.Connection") }</td>
        </tr>
        <tr>
          <td colspan="2"><b>${game.i18n.localize("DX3rd.Skill")}:&nbsp&nbsp</b>
          ${ Handlebars.compile('{{skillByKey actor key}}')({actor: this.actor, key: this.system.skill}) }</td>
        </tr>
        <tr>
          <td><b>${game.i18n.localize("DX3rd.SellSaving")}:&nbsp&nbsp</b>
          ${this.system.saving.difficulty} / ${this.system.saving.value}</td>
          <td><b>${game.i18n.localize("DX3rd.EXP")}:&nbsp&nbsp</b>
          ${this.system.exp}</td>
        </tr>
      </table>
      <p>${this.system.description}</p>

    `

    return content;
  }

  async _getItemContent() {
    let content = `
      <table>
        <tr>
          <td colspan="2"><b>${game.i18n.localize("DX3rd.EquipType")}:&nbsp&nbsp</b>
          ${ Handlebars.compile('{{timing key}}')({ key: this.system.type}) }</td>
        </tr>
        <tr>
          <td><b>${game.i18n.localize("DX3rd.SellSaving")}:&nbsp&nbsp</b>
          ${this.system.saving.difficulty} / ${this.system.saving.value}</td>
          <td><b>${game.i18n.localize("DX3rd.EXP")}:&nbsp&nbsp</b>
          ${this.system.exp}</td>
        </tr>
      </table>
      <p>${this.system.description}</p>

    `

    return content;
  }


  async applyTargetDialog(macro = true) {
    //console.log("Hi!!!")
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
            const macro = game.macros.contents.find(m => (m.name === this.system.macro));
            if (macro != undefined){
                macro.execute();
              }
            else if (this.system.macro != "") {
                new Dialog({
                    title: "macro",
                    content: `Do not find this macro: ${this.system.macro}`,
                    buttons: {}
                }).render(true);}
            //console.log(this.system.effect.disable)
            if (this.system.effect.disable != "-") {
              let targets = game.user.targets;
              //console.log("Hi we're in here now!!")
              //console.log(targets)
              for (var t of targets) {
                var a = t.actor;
                await this.applyTarget(a);
                console.log("hello ^--^")
                console.log(a)
                Hooks.call("afterUse", a);
              }
            }
            Hooks.call("updateActorEncroach", this.actor, this.id, "target");
          }
        }
      },
      close: () => {
        //Hooks.call("updateActorEncroach", this.actor, this.id, "target")
      }
    }, {top: 300, left: 20}).render(true);

  }


  async applyTarget(actor, self, hit, dmg) {
    //console.log("Do we ever get to applying to target????")
    let attributes = this.system.effect.attributes;
    if (self){
      attributes = this.system.attributes;
    }
    //console.log(attributes)
    let level = this.system.level.value;

    let copy = duplicate(attributes);
    for (const [key, value] of Object.entries(attributes)) {
      if (key == '-' || key == 'critical_min'){
        continue;
      }
      
      //conditionals checking - this means that on conditional runs, normal effects arent applied
      if (value.hitcheck != hit){
        continue;
      }

      if (value.dmgcheck != dmg){
        continue;
      }

      let val = "0";
      try {
        if (value.value != "") {
          let num = value.value.replace("@level", level);
          if (num.indexOf('@currhp') != -1){
            num = num.replace("@currhp", this.actor.system.attributes.hp.value);
          }
          if (num.indexOf('@maxhp') != -1){
            num = num.replace("@maxhp", this.actor.system.attributes.hp.max);
          }
          if (value.rollvalue != undefined ){
            num = num.replace("@roll", value.rollvalue)
          } else {
            num = num.replace("@roll", 0)
          }
          if (num.indexOf('#') != -1){
            var indices = [];
            for(var i=0; i<num.length;i++) {
              if (num[i] === "#") indices.push(i);
            }
            //get indices in string
            if (indices.length == 3){
              let front = indices[0]
              let mid = indices[1]
              let back = indices[2]
              let str = num.substring(front, back + 1)
              let id = num.substring(front + 1, mid)
              let prop = num.substring(mid + 1, back)
              
              console.log(id)
              console.log(prop)
              let item = game.items.get(id)
              if (!item){ //check to see if it exists on other char sheets
                for (let a of game.actors.contents){
                  if (a.items.get(id)){
                    item = a.items.get(id)
                    break;
                  }
                }
              }
              let tmp = item
              //dynamic indices access
              while (prop.indexOf('.') != -1){
                console.log(tmp)
                console.log(prop)
                tmp = tmp[prop.slice(0,prop.indexOf('.'))]
                prop = prop.slice(prop.indexOf('.') + 1)
              }
              num = num.replace(str, tmp[prop])
              console.log(num)
            }
          }
          //handling for dice rolls expressions
          val = String(math.evaluate(num));
        }
        
      } catch (error) {
        console.error("Values other than formula, @level, @roll are not allowed.");
      }

      copy[key].value = val;

    }


    let applied = {};
    applied[this.id] = {
      actorId: this.actor.id,
      itemId: this.id,
      disable: this.system.effect.disable,
      attributes: copy,
      modHP: this.system.effect.modHP,
      modEncroach: this.system.effect.modEncroach
    }
    if (self){
      applied[this.id].disable = "roll"
    }
    //console.log(applied)
    //console.log(actor)
    console.log
    await actor.update({'system.attributes.applied': applied});
    console.log("OKAY SO WE SHOULD HAVE THE APPLIED VERSION HERE RIGHT????")
    console.log(actor)
  }

  async setTitus() {
    await this.update({"system.titus": true});

    let chatData = {
      user: game.user.id,
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content: `${this.name}: ${game.i18n.localize("DX3rd.Titus")}`
    };

    await ChatMessage.create(chatData);
  }

  async setSublimation() {
    await this.update({"system.sublimation": true});

    let dialog = new Dialog({
      title: game.i18n.localize("DX3rd.Sublimation"),
      content: `
        <h2>${game.i18n.localize("DX3rd.Sublimation")}: ${this.name}</h2>
        <style>
        .sublimation .dialog-buttons {
          flex-direction: column;
        }
        </style>
      `,
      buttons: {
        action1: {
          icon: '<i class="fas fa-check"></i>',
          label: `${game.i18n.localize("DX3rd.SubAction1")}`,
          callback: async () => {
            let dice = this.actor.system.attributes.sublimation.dice + 10;
            await this.actor.update({"system.attributes.sublimation.dice": dice});

            let chatData = {
              user: game.user.id,
              speaker: ChatMessage.getSpeaker({ actor: this.actor }),
              content: `${this.name}: ${game.i18n.localize("DX3rd.Sublimation")}<br> ( ${game.i18n.localize("DX3rd.SubAction1")} )`
            };
            ChatMessage.create(chatData);
          }
        },
        action2: {
          icon: '<i class="fas fa-check"></i>',
          label: `${game.i18n.localize("DX3rd.SubAction2")}`,
          callback: async () => {
            let chatData = {
              user: game.user.id,
              speaker: ChatMessage.getSpeaker({ actor: this.actor }),
              content: `${this.name}: ${game.i18n.localize("DX3rd.Sublimation")}<br> ( ${game.i18n.localize("DX3rd.SubAction2")} )`
            };
            ChatMessage.create(chatData);

            let roll = new Roll("1d10");
            await roll.roll({async: true});

            roll.toMessage();
          }
        },
        action3: {
          icon: '<i class="fas fa-check"></i>',
          label: `${game.i18n.localize("DX3rd.SubAction3")}`,
          callback: async () => {

            let critical = this.actor.system.attributes.sublimation.critical -1;
            await this.actor.update({"system.attributes.sublimation.critical": critical});

            let chatData = {
              user: game.user.id,
              speaker: ChatMessage.getSpeaker({ actor: this.actor }),
              content: `${this.name}: ${game.i18n.localize("DX3rd.Sublimation")}<br> ( ${game.i18n.localize("DX3rd.SubAction3")} )`
            };
            ChatMessage.create(chatData);
          }
        },
        action4: {
          icon: '<i class="fas fa-check"></i>',
          label: `${game.i18n.localize("DX3rd.SubAction4")}`,
          callback: async () => {

            let body = this.actor.system.attributes.body.value + 10;
            await this.actor.update({"system.attributes.hp.value": body});

            let chatData = {
              user: game.user.id,
              speaker: ChatMessage.getSpeaker({ actor: this.actor }),
              content: `${this.name}: ${game.i18n.localize("DX3rd.Sublimation")}<br> ( ${game.i18n.localize("DX3rd.SubAction4")} )`
            };
            ChatMessage.create(chatData);
          }
        },
        action5: {
          icon: '<i class="fas fa-check"></i>',
          label: `${game.i18n.localize("DX3rd.SubAction5")}`,
          callback: async () => {

            let chatData = {
              user: game.user.id,
              speaker: ChatMessage.getSpeaker({ actor: this.actor }),
              content: `${this.name}: ${game.i18n.localize("DX3rd.Sublimation")}<br> ( ${game.i18n.localize("DX3rd.SubAction5")} )`
            };
            ChatMessage.create(chatData);
          }
        },


      }
    }, {classes: ["dx3rd", "dialog", "sublimation"], top: 300, left: 20}).render(true);

  }



}