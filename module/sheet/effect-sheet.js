import { DX3rdAttributesSheet } from "./attributes-sheet.js";

export class DX3rdEffectSheet extends DX3rdAttributesSheet {

  /** @override */
  _getSubmitData(updateData) {
    let formData = super._getSubmitData(updateData);
    formData = this.updateFreeForms(formData, "effect", "attributes", true);
    formData = this.updateFreeForms(formData, "effect", "statuses", true);
    formData = this.updateFreeForms(formData, "createItem", "weapons", false);
    formData = this.updateFreeForms(formData, "createItem", "armor"), false;
    formData = this.updateFreeForms(formData, "createItem", "vehicles", false);
    formData = this.updateFreeForms(formData, "createItem", "items", false);
    formData = this.updateFreeForms(formData, "flags", "effects", false);
    formData = this.updateFreeForms(formData, "flags", "items", false)
    formData = this.updateFreeForms(formData, "flags", "owned", false)
    console.log(this)
    return formData;
  }

  updateFreeForms (formData, path1, path2, parse) {
    // Handle the free-form attributes list
    const formAttrs = expandObject(formData).system[path1][path2] || {};

    let attributes;
    if (parse){
      attributes = Object.values(formAttrs).reduce((obj, v) => {
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

    } else {
      attributes = Object.values(formAttrs)
    }

    // Remove attributes which are no longer used
    if (this.object.system[path1][path2] != null)
    for ( let k of Object.keys(this.object.system[path1][path2]) ) {
      if ( !attributes.hasOwnProperty(k) ) attributes[`-=${k}`] = null;
    }

    // Re-combine formData
    formData = Object.entries(formData).filter(e => !e[0].startsWith(`system.${path1}.${path2}`)).reduce((obj, e) => {
      obj[e[0]] = e[1];
      return obj;
    }, {id: this.object.id, [`system.${path1}.${path2}`]: attributes});

    return formData;
  }

  /** @inheritdoc */
  activateListeners(html) {
    super.activateListeners(html);

    html.find(".weapon").on("click", "a.equipment-control", this._onClickControl.bind(this, "system.createItem.", ".equip", true));
    html.find(".armor").on("click", "a.equipment-control", this._onClickControl.bind(this, "system.createItem.", ".equip", true));
    html.find(".vehicles").on("click", "a.equipment-control", this._onClickControl.bind(this, "system.createItem.", ".equip", true));
    html.find(".consumables").on("click", "a.equipment-control", this._onClickControl.bind(this, "system.createItem.", ".equip", true));
    html.find(".flags").on("click", "a.flags-control", this._onClickControl.bind(this, 'system.flags.', ".flag", true));
    html.find(".statuses").on("click", "a.status-control", this._onClickControl.bind(this, 'system.effect.statuses', ".status", false));

  }

  async _onClickControl(path, point, position, event) {
    console.log(event)
    console.log(path)
    event.preventDefault();
    const a = event.currentTarget;
    const action = a.dataset.action;
    const pos = a.dataset.pos;
    const form = this.form;

    // Add new attribute
    if ( action === "create" ) {
      let attr = path
      if (position){
        attr += pos
      }
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
      const li = a.closest(point);
      li.parentElement.removeChild(li);
      await this._onSubmit(event);
    }
  }

}