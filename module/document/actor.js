export class DX3rdActor extends Actor {

  /** @Override */
  async _onCreate(data, options, userId) {
    await super._onCreate(data, options, userId);
    //add Fists to newly created character's sheet
    let newItem = {
      "name": "Fists",
      "type": "weapon",
      "img": "icons/svg/sword.svg",
      "system": {
        "type": "melee",
        "skill": "melee",
        "attack": -5,
        "range": "Close"
      }
    }
    this.createEmbeddedDocuments("Item", [newItem])
  }

  /** @Override */
  _onUpdate(data, options, userId) {
    super._onUpdate(data, options, userId);
    //sync encroach between servants and summoners
    console.log(data)
    if (this.type == "servant"){
      let s = this.system.summoner;
      if (!(JSON.stringify(this.system.attributes.encroachment) === JSON.stringify(s.system.attributes.encroachment))){ // updates have not propagated
        s.update({"system.attributes.encroachment": this.system.attributes.encroachment})
      }
    } else {
      for (let s of this.system.servants){
        console.log(this)
        console.log(s)
        if (!(JSON.stringify(this.system.attributes.encroachment) === JSON.stringify(s.system.attributes.encroachment))){ // updates have not propagated
          s.update({"system.attributes.encroachment": this.system.attributes.encroachment})
        }
      }
    }
    //update targets list if servant deleted
    for (let i = 0; i < this.appliedEffects.length; i++){
      if (this.appliedEffects[i].statuses.has("redservant")){
          
      }
    }
  }

  /** @Override */
  _onDelete(options, userId){
    if (this.type == "servant"){
      let s = this.system.summoner;
      let arr = s.system.servants
      let i = arr.indexOf(this.uuid)
      arr.splice(i, 1)
    }
    super._onDelete(options, userId)
  }

  prepareData() {
    super.prepareData();

    this._prepareActorEnc();
    this._prepareItemEnc();
    this._prepareItemUses();

    this._prepareActorItem();
    this._prepareActorSkills();

    this._prepareCombo();

    for (let e of this.appliedEffects){
      console.log(e)
      for (let i of e.changes){
        e.apply(this, i)
      }
    }
  }

  _prepareActorItem() {
    let attributes = this.system.attributes;

    let values = {
      "enc_init": { "value" : attributes.encroachment.init.input },
      "body": { "value": attributes.body.point },
      "sense": { "value": attributes.sense.point },
      "mind": { "value": attributes.mind.point },
      "social": { "value": attributes.social.point },
      
      "attack": { "value": 0 },
      "dice": { "value": 0 },
      "add": { "value": 0 },
      "critical": { "value": 10 },

      "hp": { "value": 0 },
      "init": { "value": 0 },
      "armor": { "value": 0 },
      "guard": { "value": 0 },
      "saving": { "value": 0 },
      "exp": { "value": 0 },
      "move": { "value": 0 },


      "major": { "value": 0 },
      "major_dice": { "value": 0 },
      "major_critical": { "value": 0 },

      "reaction": { "value": 0 },
      "reaction_dice": { "value": 0 },
      "reaction_critical": { "value": 0 },

      "dodge": { "value": 0 },
      "dodge_dice": { "value": 0 },
      "dodge_critical": { "value": 0 },

      "body_add": { "value": 0 },
      "sense_add": { "value": 0 },
      "mind_add": { "value": 0 },
      "social_add": { "value": 0 },
      "body_dice": { "value": 0 },
      "sense_dice": { "value": 0 },
      "mind_dice": { "value": 0 },
      "social_dice": { "value": 0 }
    }

    let skills = attributes.skills
    for (const [key, value] of Object.entries(skills)) {
      skills[key].value = parseInt(skills[key].point);
      skills[key].dice = 0;
      if (skills[key].category){
        for (const [key2, val2] of Object.entries(skills[key].subskills)){
          skills[key].subskills[key2].value = parseInt(skills[key].subskills[key2].point);
          skills[key].subskills[key2].dice = 0;
        }
      }
    }

    let works = null;
    let syndrome = [];
    let effect = [];
    let combo = [];
    let record = [];
    
    let itemType = ["weapon", "protect", "vehicle", "connection", "item"];
    let item = [];

    for (let i of this.items) {
      if (i.type == 'works')
        works = i;
      else if (i.type == 'syndrome' && attributes.syndrome[i.id])
        syndrome.push(i);
      else if (i.type == 'effect' && i.system.active.state)
        effect.push(i);
      else if (i.type == 'combo' && i.system.active.state)
        combo.push(i);
      else if (itemType.includes(i.type) && i.system.equipment)
        item.push(i);
      else if (i.type == 'record')
        record.push(i);
    }

    if (works != null) {
      values = this._updateData(values, works.system.attributes);
      this._updateSkillData(works.system.skills);
    }

    for (let s of syndrome) {
      values = this._updateData(values, s.system.attributes);
      if (syndrome.length == 1)
        values = this._updateData(values, s.system.attributes);
    }
    //before anything else is evaluated, we need to make sure all modifiers are accounted for
    //clear all old flags
    //scary infinite recursion hell... be careful!
    let itemsupdates = {}
    let abilitiesupdates = {}
    for (let e of effect) {
      abilitiesupdates[e.id] = {'system.applied': {}}
      for (let [key, effect] of Object.entries(e.system.applied)) {
        let disable = false;
        for (let [k,v] of Object.entries(effect)){
          if (v.key == "timing"){ //handle timing disabling on timing, not here
            disable = true;
          }
        }
        if (!disable){
          abilitiesupdates[e.id][`system.applied.-=${key}`] = null;
        }
      }
    }
    
    for (let i of item) {
      itemsupdates[i.id] = {'system.applied': {}}
      for (let [key, effect] of Object.entries(i.system.applied)) {
        itemsupdates[i.id][`system.applied.-=${key}`] = null;
      }
    }
   
    //console.log(abilitiesupdates)
    //console.log(itemsupdates)
    for (let e of effect) {
      if (e.system.flags.active){
        //check for matches on every other effect
        for (let j of effect){
          for (let [key,value] of Object.entries(j.system.flags.owned)){
            if (e.system.flags.checkFlag == value.name){
              //match found!
              console.log("ability match found!")
              abilitiesupdates[j.id]['system.applied'][e.id] = this._parseAppliedData(e.system.flags.effects, e.system.level.value);
              delete abilitiesupdates[j.id][`system.applied.-=${e.id}`] //delete the "erase" flag for this item
            }
          }
        }
        //check for matches on items
        
        for (let i of item){
          let updates = {}
          for (let [key,value] of Object.entries(i.system.flags.owned)){
            //console.log(key)
            //console.log(value)
            if ((e.system.flags.checkFlag == value.name) && (e.system.flags.itemType == i.type)){
              //match found!
              console.log("item match found!")
              itemsupdates[i.id]['system.applied'][e.id] = this._parseAppliedData(e.system.flags.items,e.system.level.value, e.system.flags.itemOverride);
              delete itemsupdates[i.id][`system.applied.-=${e.id}`] //delete the "erase" flag for this item
            }
          }
        }

      }
    }

    //evaluate effects
    for (let e of effect){
      e.update(abilitiesupdates[e.id])
    }
    for (let i of item){
      i.update(itemsupdates[i.id])
    }

    let fullMove = 0;
    let weaponAdd = { "melee": 0, "ranged": 0 };
    let tmp = {
      "dodge": { "value": 0 },
      "armor": { "value": 0 },
      "init": { "value": 0 }
    };

    for (let i of item) {
      let iData = i.system;

      for (let [key, value] of Object.entries(tmp)){
        if (key in iData){
          tmp[key].value += iData[key];
        }
      }

      if (i.type == "weapon" && iData.type != "-")
        weaponAdd[iData.type] += iData.add;
      if (i.type == "vehicle" && iData.move != "")
        fullMove = iData.move;

      values["saving"].value += iData.saving.value;
      values["exp"].value += iData.exp;
      this._updateSkillData(iData.skills);
    }
    values = this._updateData(values, tmp);
    attributes.add.melee = weaponAdd.melee;
    attributes.add.ranged = weaponAdd.ranged;

    attributes.exp.append = record.reduce((acc, i) => acc + i.system.exp, 0);
    attributes.exp.total = Number(attributes.exp.init) + Number(attributes.exp.append);
    this._calExp(values);
    delete values["exp"];

    attributes.critical.min = 10;
    let after = [];
    for (let e of effect) {
      if ((!e.system.checkSyndrome) && (e.system.typeCheck == "-") && (e.system.targetCheck == "-")){
        values = this._updateEffectData(values, e.system.attributes, e.system.level.value, after);
        values = this._updateEffectData(values, e.system.applied, 0)
        if ("critical_min" in e.system.attributes && e.system.attributes.critical_min.value < attributes.critical.min)
          attributes.critical.min = Number(e.system.attributes.critical_min.value);
      }
    }
    for (let e of combo) {
      values = this._updateEffectData(values, e.system.attributes, 0);
      if ("critical_min" in e.system.attributes && e.system.attributes.critical_min.value < attributes.critical.min)
        attributes.critical.min = Number(e.system.attributes.critical_min.value);
    }

    for (let e of Object.values(this.system.attributes.applied)) {
      values = this._updateEffectData(values, e.attributes, 0);
      if ("critical_min" in e.attributes && e.attributes.critical_min.value < attributes.critical.min)
        attributes.critical.min = Number(e.attributes.critical_min.value);
    }

    if (values.critical.value < attributes.critical.min)
      values.critical.value = Number(attributes.critical.min);

    let rollStat = ["major", "reaction", "dodge"];

    values["dodge_critical"].value += values["reaction_critical"].value;
    for (let l of rollStat) {
      attributes[l].critical = values[l + "_critical"].value;
      attributes[l].dice = values[l + "_dice"].value;
      delete values[l + "_critical"];
      delete values[l + "_dice"];
    }

    attributes.saving.max = values['social'].value * 2 + skills['procure'].value * 2;
    attributes.saving.remain = attributes.saving.max - values["saving"].value;

    attributes.hp.max = values['hp'].value;
    if (this.type == "servant" ){
      attributes.hp.max += attributes.hp_val
    } else {
      attributes.hp.max += values['body'].value * 2 + values['mind'].value + 20;
    }
    
    //hp minimum cap
    if (attributes.hp.value < 0){
      attributes.hp.value = 0
    }
    delete values.hp;

    values["init"].value += values['sense'].value * 2 + values['mind'].value;
    values["init"].value = (values["init"].value < 0) ? 0 : values["init"].value;
    attributes.move.battle = values["init"].value + 5 + values["move"].value;
    if (attributes.move.battle < 0 ){
      attributes.move.battle = 0
    }
    attributes.move.full = ((fullMove == 0) ? (values['init'].value + 5) * 2 : fullMove)+ values["move"].value;
    if (attributes.move.full < 0 ){
      attributes.move.full = 0
    }
    if (values["armor"].value < 0){
      values["armor"].value = 0
    }
    if (values["init"].value < 0){
      values["init"].value = 0
    }

    let mainStat = ["body", "sense", "mind", "social"];
    for (let l of mainStat) {
      values[l].value += values[l + "_dice"].value;
      attributes[l].add = values[l + "_add"].value;

      delete values[l + "_dice"];
      delete values[l + "_add"];
    }

    attributes.encroachment.init.value = parseInt(values["enc_init"].value);
    delete values["enc_init"];
    //add base encroachment rate from skills
    //console.log(this.items._source)
    for (const [key, val] of Object.entries(this.items._source)){
      //console.log(val)
      if (val.type == "effect"){
        attributes.encroachment.init.value += parseInt(val.system.encroach.init)
      }
    }

    //post processing for effects that need it 
     for (let i = 0; i < after.length; i++){
      values = this._updateEffectData(values, after[i].attributes, after[i].level);
     }
    for (const [key, value] of Object.entries(values)){
      attributes[key].value = value.value;
    }
  }

  _updateSkillData(attributes) {
    let data = this.system.attributes.skills;

    for (const [key, value] of Object.entries(attributes)) {
      if (value.apply && key in data) {
        data[key].value += value.add;

        if ("dice" in value)
          data[key].dice += value.dice;
      }
    }
  }

  _updateEffectData(values, attributes, level, after) {
    //console.log(values)
    //console.log(attributes)
    for (const [key, value] of Object.entries(attributes)) {
      if (!(key in values))
        continue;

      let val = 0;
      try {
        if (value.value != "") {
          //console.log(value)
          let num = value.value.replace("@level", level);
          if (num.indexOf('@currhp') != -1){
            if (after){
              num = num.replace("@currhp", 0);
            } else {
              num = num.replace("@currhp", this.system.attributes.hp.value);
            }
          }
          if (num.indexOf('@maxhp') != -1){
            if (after){
              after.push({attributes,level})
              num = num.replace("@maxhp", 0)
            } else {
              num = num.replace("@maxhp", this.system.attributes.hp.max)
            }
          }
          if (value.rollvalue != undefined){
            //console.log("foo")
            num = num.replace("@roll", value.rollvalue.toString())
          } else {
            //console.log("bar")
            num = num.replace("@roll", "0")
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
              
              //console.log(id)
              //console.log(prop)
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
                //console.log(tmp)
                //console.log(prop)
                tmp = tmp[prop.slice(0,prop.indexOf('.'))]
                prop = prop.slice(prop.indexOf('.') + 1)
              }
              num = num.replace(str, tmp[prop])
              //console.log(num)
            }
          }
          //console.log(num)
          val = math.evaluate(num);
          //console.log(num)
          //console.log(this.system.attributes.hp)
          //console.log(this.system.attributes.hp.value)
          //console.log(this.system.attributes.hp.max)
          //console.log(this)
        }
        
      } catch (error) {
        console.log(error)
        console.error("Values other than formula, @roll, @level are not allowed.");
      }

      values[key].value += val;
    }

    return values;
  }

  //like updateeffectdata, but for applied values instead
  _parseAppliedData(attributes, level, overwrite) {
    //console.log(values)
    //console.log(attributes)
    let obj = {}
    for (const [key, value] of Object.entries(attributes)) {
      obj[key] = {
        'key': value.key,
        'value': value.value
      }
      if (value.key != "range" && value.key != "timing"){
        //console.log(obj)
        let val = 0;
        try {
          if (value.value != "") {
            //console.log(value)
            let num = value.value.replace("@level", level);
            if (num.indexOf('@currhp') != -1){
              if (after){
                num = num.replace("@currhp", 0);
              } else {
                num = num.replace("@currhp", this.system.attributes.hp.value);
              }
            }
            if (num.indexOf('@maxhp') != -1){
              if (after){
                after.push({attributes,level})
                num = num.replace("@maxhp", 0)
              } else {
                num = num.replace("@maxhp", this.system.attributes.hp.max)
              }
            }
            if (value.rollvalue != undefined){
              //console.log("foo")
              num = num.replace("@roll", value.rollvalue.toString())
            } else {
              //console.log("bar")
              num = num.replace("@roll", "0")
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
                
                //console.log(id)
                //console.log(prop)
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
                  //console.log(tmp)
                  //console.log(prop)
                  tmp = tmp[prop.slice(0,prop.indexOf('.'))]
                  prop = prop.slice(prop.indexOf('.') + 1)
                }
                num = num.replace(str, tmp[prop])
                //console.log(num)
              }
            }
            //console.log(num)
            val = math.evaluate(num);
            //console.log(num)
            //console.log(this.system.attributes.hp)
            //console.log(this.system.attributes.hp.value)
            //console.log(this.system.attributes.hp.max)
            //console.log(this)
          }
          
        } catch (error) {
          console.log(error)
          console.error("Values other than formula, @roll, @level are not allowed.");
          val = attributes[key].value;
        }
  
        obj[key].value = val;
        if (overwrite){
          obj[key].overwrite = true
        }
      }
      //console.log('waves')
      //console.log(obj)
      //console.log(overwrite)
    }

    return obj;
  }

  _updateData(values, attributes) {
    for (const [key, value] of Object.entries(attributes))
      if (key != '-')
        values[key].value += value.value;

    return values;
  }

  _calExp(values) {
    let exp = values["exp"].value;
    let list = ["body", "sense", "mind", "social"];

    for (let l of list) {
      let total = values[l].value;
      let point = this.system.attributes[l].point;

      if (total < 12)
        exp += point * 10;
      else if (total < 22)
        exp += 110 - (total - point) * 10 + (total - 11) * 20;
      else
        exp += 310 - (total - point) * 10 + (total - 21) * 30;
    }

    let skills = this.system.attributes.skills
    for (const [key, value] of Object.entries(skills)) {
      let total = value.value;
      let point = value.point;
      let d = (value.delete) ? 1 : 2;

      if (total < 7)
        exp += point * d;
      else if (total < 12)
        exp += 6 * d - (total - point) * d + (total - 6) * 3;
      else if (total < 22)
        exp += 15 + 6 * d - (total - point) * d + (total - 11) * 5;
      else
        exp += 65 + 6 * d - (total - point) * d + (total - 21) * 10;
    }

    for (let i of this.items) {
      if (i.type == 'effect') {
        let level = i.system.level.init;
        let own = i.system.exp.own;
        let upgrade = i.system.exp.upgrade;

        if (own)
          exp += (i.system.type != "easy") ? 15 : 2;
        if (upgrade)
          exp += (i.system.type != "easy") ? (level - 1) * 5 : (level - 1) * 2;
      }
    }

    this.system.attributes.exp.now = this.system.attributes.exp.total - exp;
  }

  _prepareActorSkills() {
    let skills = {
      "body": {},
      "sense": {},
      "mind": {},
      "social": {}
    }

    let data = this.system.attributes.skills;
    for (let [key, value] of Object.entries(data)) {
      if (value.base === "body"){
        skills.body[key] = value;
      }
      else if (value.base === "sense"){
        skills.sense[key] = value;
      }
      else if (value.base === "mind"){
        skills.mind[key] = value;
      }
      else if (value.base === "social"){
        skills.social[key] = value;
      }

      if (value.category){
        for (let [key2, val2] of Object.entries(value.subskills)){
          if (val2.base === "body"){
            skills.body[key2] = val2;
          }
          else if (value.base === "sense"){
            skills.sense[key2] = val2;
          }
          else if (value.base === "mind"){
            skills.mind[key2] = val2;
          }
          else if (value.base === "social"){
            skills.social[key2] = val2;
          }
        }
      }

    }

    this.system.skills = skills;
  }

  _prepareActorEnc() {
    let enc = this.system.attributes.encroachment;
    let encType = enc.type;
    enc.dice = 0;
    enc.level = 0;

    let encList = {
      "-": {
        dice: [60, 80, 100, 130, 160, 200, 240, 300],
        level: [100, 160]
      },
      "ea": {
        dice: [60, 80, 100, 130, 190, 260, 300],
        level: [100, 160, 220]
      },
      "origin": {
        dice: [],
        level: [80, 100, 150]
      }
    }

    for (let [type, list] of [["dice",  encList[encType].dice], ["level", encList[encType].level]]) {
      for (let l of list) {
        if (enc.value < l)
          break;
        enc[type] += 1;
      }
    }

  }

  _prepareItemEnc() {
    for (let i of this.items) {
      if (i.type == 'effect') {
        i.system.level.value = i.system.level.init;
        if (!i.system.level.upgrade)
          continue;
        
        i.system.level.value += this.system.attributes.encroachment.level;
      }
    }

  }

  _prepareItemUses() {
    for (let i of this.items){
      if (i.type == 'effect'){
        //update uses formula????
        let num = i.system.uses.formula_max
        try {
          num = num.replace("@level", i.system.level.value);
          if (num.indexOf('#') != -1){
            var indices = [];
            for(var j=0; j<num.length;j++) {
              if (num[j] === "#") indices.push(j);
            }
            //get indices in string
            if (indices.length == 3){
              let front = indices[0]
              let mid = indices[1]
              let back = indices[2]
              let str = num.substring(front, back + 1)
              let id = num.substring(front + 1, mid)
              let prop = num.substring(mid + 1, back)
              
              //console.log(id)
              //console.log(prop)
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
                //console.log(tmp)
                //console.log(prop)
                tmp = tmp[prop.slice(0,prop.indexOf('.'))]
                prop = prop.slice(prop.indexOf('.') + 1)
              }
              num = num.replace(str, tmp[prop])
              //console.log(num)
            }
          }
          num = math.evaluate(num);
        } catch (error){
          
          console.log("Values other than formula, @level are not allowed.")
        }
        //console.log(num)
        if (isNaN(num)){
          num = 0
        }
        //check for additional uses
        if (i.system.applied){
          for (let [k,v] of Object.entries(i.system.applied)){
            for (let [key, value] of Object.entries(v)){
              if (value.key == "current_uses"){
                num += Number.parseInt(value.value)
              }
            }
          }
        }
        i.system.uses.max = num
        if (num > i.system.uses.current){
          i.system.uses.current = num
        }
        
      }
    }
  }


  _prepareCombo() {

    let combos = [];
    for (let i of this.items) {
      if (i.type == 'combo')
        combos.push(i);
    }

    let attributes = this.system.attributes;
    let valuesOriginal = {
      "attack": { "value": 0 },
      "add": { "value": 0 },
      "dice": { "value": 0 },
      "critical": { "value": 0 },

      "major": { "value": 0 },
      "major_dice": { "value": 0 },
      "major_critical": { "value": 0 },

      "reaction": { "value": 0 },
      "reaction_dice": { "value": 0 },
      "reaction_critical": { "value": 0 },

      "dodge": { "value": 0 },
      "dodge_dice": { "value": 0 },
      "dodge_critical": { "value": 0 },


      "body_add": { "value": 0 },
      "sense_add": { "value": 0 },
      "mind_add": { "value": 0 },
      "social_add": { "value": 0 },
      "body_dice": { "value": 0 },
      "sense_dice": { "value": 0 },
      "mind_dice": { "value": 0 },
      "social_dice": { "value": 0 }
    }

    for (let c of combos) {
      let values = duplicate(valuesOriginal);
      let critical_min = attributes.critical.min;

      let comboData = c.system;
      let encroachStr = [];
      comboData.encroach.value = 0;

      let effectList = comboData.effect;
      let effectItems = comboData.effectItems = {};
      let weaponList = comboData.weapon;
      let weaponItems = comboData.weaponItems = {};
      //console.log("AAAAAAAAAAA")
      for (let effectId of effectList) {
        if (this.items.get(effectId) == undefined)
          continue;

        let effect = this.items.get(effectId);
        //console.log(effect)
        effectItems[effectId] = effect;
        if(!effect.system.disabled){
          if ( Number.isNaN(Number(effect.system.encroach.value)) )
          encroachStr.push(effect.system.encroach.value);
        else
          comboData.encroach.value += Number(effect.system.encroach.value);

        if (effect.system.active.state)
          continue;

        values = this._updateEffectData(values, effect.system.attributes, effect.system.level.value);
        if ("critical_min" in effect.system.attributes && effect.system.attributes.critical_min.value < critical_min)
          critical_min = Number(effect.system.attributes.critical_min.value);
        }
      }

      if (encroachStr.length > 0)
        comboData.encroach.value += "+" + encroachStr.join("+");

      values = this._updateEffectData(values, comboData.attributes, 0);
      if ("critical_min" in comboData.attributes && comboData.attributes.critical_min.value < critical_min)
        critical_min = Number(comboData.attributes.critical_min.value);


      for (let weaponId of weaponList) {
        if (this.items.get(weaponId) == undefined)
          continue;

        let weapon = this.items.get(weaponId);
        weaponItems[weaponId] = weapon;
        values.attack.value += weapon.system.attack;
      }

      comboData.major.value = Number(attributes.major.value) + values.major.value;
      comboData.major.dice = Number(attributes.major.dice) + values.major_dice.value;
      comboData.major.critical = Number(attributes.critical.value) + values.critical.value + Number(attributes.major.critical) + values.major_critical.value;
      if (comboData.major.critical < critical_min)
        comboData.major.critical = critical_min;

      comboData.reaction.value = Number(attributes.reaction.value) + values.reaction.value;
      comboData.reaction.dice = Number(attributes.reaction.dice) + values.reaction_dice.value;
      comboData.reaction.critical = Number(attributes.critical.value) + values.critical.value + Number(attributes.reaction.critical) + values.reaction_critical.value;
      if (comboData.reaction.critical < critical_min)
        comboData.reaction.critical = critical_min;

      comboData.dodge.value = comboData.reaction.value + Number(attributes.dodge.value) + values.dodge.value;
      comboData.dodge.dice = comboData.reaction.dice + Number(attributes.dodge.dice) + values.dodge_dice.value;
      comboData.dodge.critical = Number(attributes.critical.value) + values.critical.value + Number(attributes.dodge.critical) + values.dodge_critical.value + values.reaction_critical.value;
      if (comboData.dodge.critical < critical_min)
        comboData.dodge.critical = critical_min;


      comboData.attack.value = Number(attributes.attack.value) + values.attack.value;
      comboData.add.value = Number(attributes.add.value) + values.add.value;
      comboData.dice.value = Number(attributes.dice.value) + values.dice.value;
      comboData.critical.value = Number(attributes.critical.value) + values.critical.value;
      comboData.critical.min = critical_min;
      if (comboData.critical.value < critical_min)
        comboData.critical.value = critical_min;


      if (comboData.roll != "-") {
        comboData.dice.value += comboData[comboData.roll].dice + Number(this.system.attributes.encroachment.dice) + Number(this.system.attributes.sublimation.dice);
        comboData.add.value += comboData[comboData.roll].value;
        comboData.critical.value = comboData[comboData.roll].critical + Number(this.system.attributes.sublimation.critical);
      }

      if (comboData.skill != "-" ) {
        let skill;
        if (comboData.skill in attributes.skills){
          skill = attributes.skills[comboData.skill];
        } else { //subskills check
          for (let [key,val] of Object.entries(attributes.skills)){
            if (val.category && comboData.skill in val.subskills){
              skill = val.subskills[comboData.skill];
              break;
            }
          }
        }
        comboData.dice.value += skill.dice;
        comboData.add.value += skill.value;
      }

      if (comboData.base != "-") {
        let base = attributes[comboData.base];

        comboData.dice.value += base.value + values[comboData.base + "_dice"].value;
        comboData.add.value += base.add + values[comboData.base + "_add"].value;
      }

      //console.log(c)
      //console.log(comboData)

      if (game.ready && c.sheet.rendered)
        c.render(true);
    }

  }


  /* -------------------------------------------- */

  /** @override */
  _onCreateDescendantDocuments(parent, collection, documents, data, options, userId) {
    super._onCreateDescendantDocuments(parent, collection, documents, data, options, userId);

    for (let doc of documents) {
      if (doc.type == "effect" || doc.type == "combo" || doc.type == "rois" || doc.type == "syndrome" || doc.type == "record"){
        continue;
      }
      if (doc instanceof ActiveEffect){
        continue;
      }

      this._addSkill(doc.system.skills);
    }
  }

  /* -------------------------------------------- */

  /** @override */
  _onUpdateDescendantDocuments(parent, collection, documents, changes, options, userId) {
    super._onUpdateDescendantDocuments(parent, collection, documents, changes, options, userId);

    for (let doc of documents) {
      if (doc.type == "effect" || doc.type == "combo" || doc.type == "rois" || doc.type == "syndrome" || doc.type == "record"){
        continue;
      }
      if (doc instanceof ActiveEffect){
        continue;
      }
      //make sure 
      this._addSkill(doc.system.skills);
    }
    // effect linking
    
  }

  /* -------------------------------------------- */
  
  async _addSkill(skill) {
    let data = this.system.attributes.skills;
    for (const [key, value] of Object.entries(skill)) {
      if (key in data || !value.apply || key == "" || value.base == "-")
        continue;

      let skill = {
        "name": value.name,
        "point": 0,
        "base": value.base,
        "delete": true
      }

      await this.update({[`data.attributes.skills.${key}`]: skill});
    }
  }

  async rollDice(title, diceOptions, append) {
    let content = "";
    var ret;
    let updateOptions = () => {};
    if (append) {
      content = `
        <table style="text-align: center;">
          <tr>
            <th>${game.i18n.localize("DX3rd.Dice")}</th>
            <th>${game.i18n.localize("DX3rd.Critical")}</th>
            <th>${game.i18n.localize("DX3rd.Add")}</th>
          </tr>
          <tr>
            <td><input type='text' id='roll-append-dice'></td>
            <td><input type='text' id='roll-append-critical'></td>
            <td><input type='text' id='roll-append-add'></td>
          </tr>
        </table><script>$("#dice").focus()</script>
        `;
      updateOptions = () => {
        diceOptions.appendDice = $("#roll-append-dice").val();
        diceOptions.appendCritical = $("#roll-append-critical").val();
        diceOptions.appendAdd = $("#roll-append-add").val();
      }
    }

    let buttons = {
        major: {
          icon: '<i class="fas fa-check"></i>',
          label: game.i18n.localize("DX3rd.Major"),
          callback: async () => {
            if (append){
              updateOptions();
            }
            diceOptions["rollType"] = "major";
            ret = await this._onRollDice(title, diceOptions);
            console.log('first!')
            console.log(ret)
            return ret;
          }
        },
        reaction: {
          icon: '<i class="fas fa-check"></i>',
          label: game.i18n.localize("DX3rd.Reaction"),
          callback: async () => {
            if (append){
              updateOptions();
            }
            diceOptions["rollType"] = "reaction";
            ret = await this._onRollDice(title, diceOptions);
            console.log('second!')
            console.log(ret)
            return ret;
          }
        },
        dodge: {
          icon: '<i class="fas fa-check"></i>',
          label: game.i18n.localize("DX3rd.Dodge"),
          callback: async () => {
            if (append){
              updateOptions();
            }
            diceOptions["rollType"] = "dodge";
            ret = await this._onRollDice(title, diceOptions);
            console.log('third!')
            console.log(ret)
            return ret;
          }
        }
    }

    if ("rollType" in diceOptions) {
      buttons = {
        "major": {
          icon: '<i class="fas fa-check"></i>',
          label: game.i18n.localize("DX3rd.Roll"),
          callback: async () => {
            if (append){
              updateOptions();
            }
            ret = await this._onRollDice(title, diceOptions);
            console.log('fourth!')
            console.log(ret)
            return ret;
          }
        }
      }
    }


    ret = Dialog.wait({
        title: game.i18n.localize("DX3rd.RollType"),
        content: content,
        buttons: buttons,
        default: "major"
    });
    console.log(ret)
    return ret;
  }

  _getDiceData(diceOptions) {
    //console.log(diceOptions)
    let attributes = this.system.attributes;
    let base = this.system.attributes[diceOptions.base];
    //console.log(base)
    let skill = this.system.skills[diceOptions.base][diceOptions.skill]
    //console.log(skill)
    //console.log(base)

    let dice = base.value;
    let add = base.add;
    if (diceOptions.skill != null && diceOptions.skill != "-") {
      dice += skill.dice;
      add += skill.value;
    }

    dice += Number(attributes.dice.value) + Number(attributes.encroachment.dice) + Number(attributes.sublimation.dice);
    add += Number(attributes.add.value);
    let critical = attributes.critical.value;

    let rollType = diceOptions.rollType;
    dice += Number(attributes[rollType].dice);
    add += Number(attributes[rollType].value);
    critical += attributes[rollType].critical;

    if (critical < attributes.critical.min)
      critical = Number(attributes.critical.min);
    critical += Number(attributes.sublimation.critical);

    if (rollType == "dodge") {
      dice += Number(attributes["reaction"].dice);
      add += Number(attributes["reaction"].value);
    }

    return { dice, add, critical };
  }

  async _onRollDice(title, diceOptions) {
    let attributes = this.system.attributes;
    let rollType = diceOptions.rollType;
    //console.log("Hi! We're in onRollDice")
    //console.log(diceOptions)
    let {dice, add, critical} = this._getDiceData(diceOptions);

    if ("attack" in diceOptions) {
      add += Number(attributes.add[diceOptions.attack.type]);
    }

    if ("appendDice" in diceOptions && diceOptions.appendDice != "") {
      let append = (diceOptions.appendDice < 0) ? diceOptions.appendDice : "+" + diceOptions.appendDice;
      dice = `(${dice}${append})`;
    }

    if ("appendCritical" in diceOptions && diceOptions.appendCritical != "") {
      let append = (diceOptions.appendCritical < 0) ? diceOptions.appendCritical : "+" + diceOptions.appendCritical;
      critical = `(${critical}${append})`;
    }

    if ("appendAdd" in diceOptions && diceOptions.appendAdd != "") {
      let append = (diceOptions.appendAdd < 0) ? diceOptions.appendAdd : "+" + diceOptions.appendAdd;
      add = `(${add}${append})`;
    }

    let formula = `${dice}dx${critical} + ${add}`;
    let roll = new Roll(formula);
    await roll.roll({async: true})

    let text = ("content" in diceOptions) ? diceOptions.content : "";
    let rollMode = game.settings.get("core", "rollMode");
    let rollData = await roll.render();
    let content = `
      <div class="dx3rd-roll" data-actor-id=${this.id}>
        <h2 class="header"><div class="title">${title}</div></h2>
        ${rollData}
        <div class="btn-box">${text}</div>
        
    `;

    if ("attack" in diceOptions) {
      let attack = Number(attributes.attack.value) + diceOptions.attack.value;
      let reaction = diceOptions.reaction;
      let critical = diceOptions.critical;
      let actor = diceOptions.actor;
      let id = diceOptions.key;
      let list = diceOptions.list;
      if (attack < 0){
        attack = 0;
      }
      content += `<button class="chat-btn calc-damage" data-attack="${attack}" data-reaction="${reaction}" data-critical="${critical}" data-roll="${roll._total}" data-actor="${actor}" data-id="${id}" data-list="${list}" >${game.i18n.localize("DX3rd.DamageRoll")}</button>`;
      //insert defense dialog + this has been moved to the damage roll handler
      //content += `<button class="chat-btn choose-defense" data-reaction="${reaction}" data-critical="${critical}" data-roll="${roll._total}" >${game.i18n.localize("DX3rd.Defend")}</button>`;
    }

    ChatMessage.create({
      speaker: ChatMessage.getSpeaker({actor: this}),
      content: content + `</div>`,
      type: CONST.CHAT_MESSAGE_TYPES.ROLL,
      sound: CONFIG.sounds.dice,
      roll: roll,
    }, {rollMode});

    if ("key" in diceOptions) {
        await Hooks.call("updateActorEncroach", this, diceOptions.key, "roll");
    }

    if (rollType == "major") 
      Hooks.call("afterMajor", this);
    else if (rollType == "reaction" || rollType == "dodge") {
      Hooks.call("afterReaction", this);

      await this.update({ "system.attributes.sublimation.dice": 0, "system.attributes.sublimation.critical": 0 });
    }
    let val = 0;
    if ("return" in diceOptions){
      val = roll._total
    }
    console.log(val)
    return val;
  }


  /** @override */
  async modifyTokenAttribute(attribute, value, isDelta=false, isBar=true) {
    const current = foundry.utils.getProperty(this.system, attribute);

    // Determine the updates to make to the actor data
    let updates;
    if ( isBar ) {
      if (isDelta) value = Number(current.value) + value;
      updates = {[`data.${attribute}.value`]: value};
    } else {
      if ( isDelta ) value = Number(current) + value;
      updates = {[`data.${attribute}`]: value};
    }

    const allowed = Hooks.call("modifyTokenAttribute", {attribute, value, isDelta, isBar}, updates);
    return allowed !== false ? this.update(updates) : this;
  }

  

}