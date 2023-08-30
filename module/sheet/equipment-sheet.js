import { DX3rdWorksSheet } from "./works-sheet.js";

export class DX3rdEquipmentSheet extends DX3rdWorksSheet {
  /** @override */
  _getSubmitData(updateData) {
    let formData = super._getSubmitData(updateData);
    formData = this.updateFlagsOwned(formData);
    return formData;
  }

  /** @override */
  async getData(options) {
    let data = await super.getData(options);

    let skills = data.system.skills;
    let actorSkills = data.system.actorSkills;

    for (const [key, value] of Object.entries(skills)) {
      if (key in actorSkills)
        continue;

      if (value.apply)
        actorSkills[key] = value;
    }

    return data;
  }

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);
    html.find(".flags").on("click", "a.flags-control", this._onClickFlagControl.bind(this));
  }

  updateFlagsOwned (formData) {
    // Handle the free-form attributes list
    const formAttrs = expandObject(formData).system.flags.owned || {};

    const attributes = Object.values(formAttrs)

    // Remove attributes which are no longer used
    if (this.object.system.flags.owned != null)
    for ( let k of Object.keys(this.object.system.flags.owned) ) {
      if ( !attributes.hasOwnProperty(k) ) attributes[`-=${k}`] = null;
    }

    // Re-combine formData
    formData = Object.entries(formData).filter(e => !e[0].startsWith("system.flags.owned")).reduce((obj, e) => {
      obj[e[0]] = e[1];
      return obj;
    }, {id: this.object.id, "system.flags.owned": attributes});

    return formData;
  }

  async _onClickFlagControl(event) {
    event.preventDefault();
    const a = event.currentTarget;
    const action = a.dataset.action;
    const pos = a.dataset.pos;
    const form = this.form;

    // Add new attribute
    if ( action === "create" ) {
      let attr = 'system.flags.' + pos
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
      const li = a.closest(".flag");
      li.parentElement.removeChild(li);
      await this._onSubmit(event);
    }
  }

}