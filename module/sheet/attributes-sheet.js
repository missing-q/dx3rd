import { DX3rdItemSheet } from "./item-sheet.js";

export class DX3rdAttributesSheet extends DX3rdItemSheet {

  /** @override */
  async getData(options) {
    let data = await super.getData(options);

    if (this.actor != null)
      data.system.actorSkills = duplicate(this.actor.system.attributes.skills);
    else
      data.system.actorSkills = duplicate(game.DX3rd.baseSkills);

    return data;
  }

  /* -------------------------------------------- */

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    // Everything below here is only needed if the sheet is editable
    if (!this.options.editable) return;

    // Add or Remove Attribute
    html.find(".attributes").on("click", "a.attribute-control", this._onClickControl.bind(this, "system.attributes", ".attribute", false));
  }

  /* -------------------------------------------- */

  /** @override */
  _getSubmitData(updateData) {
    let formData = super._getSubmitData(updateData);
    formData = this.updateFreeForms(formData, "attributes", "", true);
    return formData;
  }

}