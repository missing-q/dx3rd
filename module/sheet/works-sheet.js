import { DX3rdItemSheet } from "./item-sheet.js";

export class DX3rdWorksSheet extends DX3rdItemSheet {

  /** @override */
  async getData(options) {
    let data = await super.getData(options);

    if (this.actor != null){
      data.system.actorSkills = duplicate(this.actor.system.attributes.skills);
      for (const [key, value] of Object.entries(data.system.actorSkills)){
        if (value.category){
          for (const [key2, val2] of Object.entries(value.subskills)){
            let tmp = val2;
            tmp.name = `${value.name}:${val2.name}`
            data.system.actorSkills[key2] = tmp
          }
        }
      }
    } else {
      data.system.actorSkills = duplicate(game.DX3rd.baseSkills);
    }

    return data;
  }

  /* -------------------------------------------- */

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    // Everything below here is only needed if the sheet is editable
    if (!this.options.editable) return;

    // Add or Remove Attribute
    html.find(".add-skills").on("click", ".skill-create", this._onSkillCreate.bind(this));
    html.find(".skills").on("click", "a.attribute-control", this._onClickControl.bind(this, "system.skills", ".attribute", false));
  }

  /* -------------------------------------------- */

  async _onSkillCreate(event) {
    let key = this.item.system.skillTmp;
    console.log(key)

    let newKey = document.createElement("div");
    const skill = `<input type="hidden" name="system.skills.${key}.key" value="${key}"/>`;
    newKey.innerHTML = skill;

    newKey = newKey.children[0];
    this.form.appendChild(newKey);
    await this._onSubmit(event);
  }


  /* -------------------------------------------- */

  /** @override */
  _getSubmitData(updateData) {
    let formData = super._getSubmitData(updateData);
    formData = this.updateFreeForms(formData, "skills", "", false, true);
    return formData;
  }
  
}