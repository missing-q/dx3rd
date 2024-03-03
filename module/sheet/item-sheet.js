
export class DX3rdItemSheet extends ItemSheet {

  /** @override */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ["dx3rd", "sheet", "item"],
      width: 520,
      height: 480,
      tabs: [{navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "description"}]
    });
  }
  
  /* -------------------------------------------- */

  /** @override */
  get template() {
    const path = "systems/dx3rd/templates/sheet/item";
    return `${path}/${this.item.type}-sheet.html`;
  }

  /* -------------------------------------------- */

  /** @override */
  async getData(options) {
    let isOwner = false;
    let isEditable = this.isEditable;

    const data = super.getData(options);
    let items = {};
    let effects = {};
    let actor = null;

    data.system = this.document.system;
    isOwner = this.document.isOwner;
    isEditable = this.isEditable;

    data.enrichedBiography = await TextEditor.enrichHTML(this.object.system.description, {async: true});

    return data;
  }

  /* -------------------------------------------- */

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    // Everything below here is only needed if the sheet is editable
    if (!this.options.editable) return;

    // Add or Remove Attribute
    //html.find(".attributes").on("click", ".attribute-control", this._onClickAttributeControl.bind(this));
  }

  /* -------------------------------------------- */

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
      console.log(li)
      li.parentElement.removeChild(li);
      await this._onSubmit(event);
    }
  }

  updateFreeForms (formData, path1, path2, parsevals, parse) {
    // Handle the free-form attributes list
    let formAttrs;
    if (path2 != ""){
      formAttrs = expandObject(formData).system[path1][path2] || {};
    } else {
      formAttrs = expandObject(formData).system[path1] || {};
    }
    console.log(formAttrs)

    let object;
    let str;
    if (path2 == ""){
      object = this.object.system[path1]
      str = `system.${path1}`
    } else {
      object = this.object.system[path1][path2]
      str = `system.${path1}.${path2}`
    }

    let attributes;
    if (parsevals){
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
      if (parse){
        attributes = Object.values(formAttrs).reduce((obj, v) => {
          console.log(v)
          let k = v["key"]
          if (Array.isArray(k)){
            k = k[0]
          }
          k = k.trim();
          if ( /[\s\.]/.test(k) ) {
            ui.notifications.error("Attribute keys may not contain spaces or periods");
            return obj;
          }
    
          delete v["key"];
          obj[k] = v;
          return obj;
        }, {});
    
        if (attributes == undefined){
          attributes = object
        }
      } else {
        attributes = Object.values(formAttrs)
      }
    }
    console.log(attributes)
    // Remove attributes which are no longer used
    if (object != null)
    for ( let k of Object.keys(object) ) {
      if ( !attributes.hasOwnProperty(k) ) attributes[`-=${k}`] = null;
    }

    // Re-combine formData
    formData = Object.entries(formData).filter(e => !e[0].startsWith(str)).reduce((obj, e) => {
      obj[e[0]] = e[1];
      return obj;
    }, {id: this.object.id, [str]: attributes});
    return formData;
  }


}