import { DX3rdAttributesSheet } from "./attributes-sheet.js";

export class DX3rdEffectSheet extends DX3rdAttributesSheet {

  /** @override */
  _getSubmitData(updateData) {
    let formData = super._getSubmitData(updateData);
    formData = this.updateEffectAttributes(formData);
    formData = this.updateCreatedWeapons(formData);
    formData = this.updateCreatedArmor(formData);
    formData = this.updateCreatedVehicles(formData);
    formData = this.updateCreatedItems(formData);
    console.log(this)
    return formData;
  }

  updateEffectAttributes(formData) {
    // Handle the free-form attributes list
    const formAttrs = expandObject(formData).system.effect.attributes || {};

    const attributes = Object.values(formAttrs).reduce((obj, v) => {
      let k = v["key"].trim();
      if ( /[\s\.]/.test(k) )  return ui.notifications.error("Attribute keys may not contain spaces or periods");
      delete v["key"];

      try {
        if (k != "-") {
          let num = v.value.replace("@level", 0);
          if (v.rollvalue != undefined ){
            num = num.replace("@roll", v.rollvalue)
          } else {
            num = num.replace("@roll", 0)
          }
          num = num.replace("@maxhp", 0)
          num = num.replace("@currhp", 0)
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
              num = num.replace(str, 0)
            }
          }
          math.evaluate(num);
        }
      } catch (error) {
        console.log(error)
        ui.notifications.error(v.value + ": Values other than formula, @roll, @level are not allowed.");
      }

      obj[k] = v;
      return obj;
    }, {});

    // Remove attributes which are no longer used
    if (this.object.system.effect.attributes != null)
    for ( let k of Object.keys(this.object.system.effect.attributes) ) {
      if ( !attributes.hasOwnProperty(k) ) attributes[`-=${k}`] = null;
    }

    // Re-combine formData
    formData = Object.entries(formData).filter(e => !e[0].startsWith("system.effect.attributes")).reduce((obj, e) => {
      obj[e[0]] = e[1];
      return obj;
    }, {id: this.object.id, "system.effect.attributes": attributes});

    return formData;
  }

  updateCreatedWeapons (formData) {
    // Handle the free-form attributes list
    const formAttrs = expandObject(formData).system.createItem.weapons || {};

    const attributes = Object.values(formAttrs)

    // Remove attributes which are no longer used
    if (this.object.system.createItem.weapons != null)
    for ( let k of Object.keys(this.object.system.createItem.weapons) ) {
      if ( !attributes.hasOwnProperty(k) ) attributes[`-=${k}`] = null;
    }

    // Re-combine formData
    formData = Object.entries(formData).filter(e => !e[0].startsWith("system.createItem.weapons")).reduce((obj, e) => {
      obj[e[0]] = e[1];
      return obj;
    }, {id: this.object.id, "system.createItem.weapons": attributes});

    return formData;
  }

  updateCreatedArmor (formData) {
    // Handle the free-form attributes list
    const formAttrs = expandObject(formData).system.createItem.armor || {};

    const attributes = Object.values(formAttrs)

    // Remove attributes which are no longer used
    if (this.object.system.createItem.armor != null)
    for ( let k of Object.keys(this.object.system.createItem.armor) ) {
      if ( !attributes.hasOwnProperty(k) ) attributes[`-=${k}`] = null;
    }

    // Re-combine formData
    formData = Object.entries(formData).filter(e => !e[0].startsWith("system.createItem.armor")).reduce((obj, e) => {
      obj[e[0]] = e[1];
      return obj;
    }, {id: this.object.id, "system.createItem.armor": attributes});

    return formData;
  }

  updateCreatedVehicles (formData) {
    // Handle the free-form attributes list
    const formAttrs = expandObject(formData).system.createItem.vehicles || {};

    const attributes = Object.values(formAttrs)

    // Remove attributes which are no longer used
    if (this.object.system.createItem.vehicles != null)
    for ( let k of Object.keys(this.object.system.createItem.vehicles) ) {
      if ( !attributes.hasOwnProperty(k) ) attributes[`-=${k}`] = null;
    }

    // Re-combine formData
    formData = Object.entries(formData).filter(e => !e[0].startsWith("system.createItem.vehicles")).reduce((obj, e) => {
      obj[e[0]] = e[1];
      return obj;
    }, {id: this.object.id, "system.createItem.vehicles": attributes});

    return formData;
  }

  updateCreatedItems (formData) {
    // Handle the free-form attributes list
    const formAttrs = expandObject(formData).system.createItem.items || {};

    const attributes = Object.values(formAttrs)

    // Remove attributes which are no longer used
    if (this.object.system.createItem.items != null)
    for ( let k of Object.keys(this.object.system.createItem.items) ) {
      if ( !attributes.hasOwnProperty(k) ) attributes[`-=${k}`] = null;
    }

    // Re-combine formData
    formData = Object.entries(formData).filter(e => !e[0].startsWith("system.createItem.items")).reduce((obj, e) => {
      obj[e[0]] = e[1];
      return obj;
    }, {id: this.object.id, "system.createItem.items": attributes});

    return formData;
  }

  /** @inheritdoc */
  activateListeners(html) {
    super.activateListeners(html);

    html.find(".weapon").on("click", "a.equipment-control", this._onClickEquipControl.bind(this));
    html.find(".armor").on("click", "a.equipment-control", this._onClickEquipControl.bind(this));
    html.find(".vehicles").on("click", "a.equipment-control", this._onClickEquipControl.bind(this));
    html.find(".consumables").on("click", "a.equipment-control", this._onClickEquipControl.bind(this));

  }

  async _onClickEquipControl(event) {
    event.preventDefault();
    const a = event.currentTarget;
    const action = a.dataset.action;
    const pos = a.dataset.pos;
    const form = this.form;

    // Add new attribute
    if ( action === "create" ) {
      let attr = 'system.createItem.' + pos
      console.log(attr)
      

      if ($(form).find(`select[name='${attr}.-.key']`).length != 0)
        return;

      let newKey = document.createElement("div");
      const skill = `<input type="hidden" name="${attr}.-.key" value="-"/>`;
      newKey.innerHTML = skill;

      newKey = newKey.children[0];
      form.appendChild(newKey);
      console.log(newKey)
      await this._onSubmit(event);
    }

    // Remove existing attribute
    else if ( action === "delete" ) {
      const li = a.closest(".equip");
      li.parentElement.removeChild(li);
      await this._onSubmit(event);
    }
  }

}