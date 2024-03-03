import { DX3rdWorksSheet } from "./works-sheet.js";

export class DX3rdEquipmentSheet extends DX3rdWorksSheet {
  /** @override */
  _getSubmitData(updateData) {
    let formData = super._getSubmitData(updateData);
    formData = this.updateFreeForms(formData, "flags", "effects", false, false);
    formData = this.updateFreeForms(formData, "flags", "items", false, false)
    formData = this.updateFreeForms(formData, "flags", "owned", false, false)
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
    console.log(data)

    return data;
  }

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);
    html.find(".flags").on("click", "a.flags-control", this._onClickControl.bind(this, 'system.flags.', ".flag", true));
  }

}