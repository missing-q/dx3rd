export class SelectItemsDialog extends Dialog {

  constructor(actor, items, count, callback, options) {
    super(options);

    this.actor = actor;
    this.items = items;
    this.count = count;
    this.curr = 0;
    this.callback = callback;

    this.data = {
      title: game.i18n.localize("DX3rd.WeaponSelect"),
      content: "",
      buttons: {
        create: {
          label: "Apply",
          callback: () => this._onSubmit()

        }
      },
      default: 'create'
    };

  }

  /** @override */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      template: "systems/dx3rd/templates/dialog/select-items-dialog.html",
      classes: ["dx3rd", "dialog"],
      width: 600
    });
  }

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    html.find('.item-label').click(this._onShowItemDetails.bind(this));
    html.find(".echo-item").click(this._echoItemDescription.bind(this));
    html.find('.check-equipment').change(this._updateItemTotals.bind(this))
    
  }

  /** @override */
  getData() {
    let vehicleList = [];
    let weaponList = [];
    let itemList = [];
    let armorList = [];

    for (let i of this.items) {
      if (i.type == 'weapon'){
        weaponList.push(i);
      }
      else if (i.type == 'vehicle'){
        vehicleList.push(i);
      }
      else if (i.type == 'protect'){
        armorList.push(i);
      }
      else if (i.type == 'item'){
        itemList.push(i);
      }
        
    }

    return {
      title: this.data.title,
      content: this.data.content,
      buttons: this.data.buttons,
      
      actor: this.actor,
      vehicleList: vehicleList,
      weaponList: weaponList,
      armorList: armorList,
      itemList: itemList,
      count: this.count
    }
  }

  async _onSubmit() {
    let names = [];
    let itemList = [];

    await $(".check-equipment").each((i, val) => {
      if ($(val).is(":checked")) {
        names.push( val.dataset.name);
      }
    });
    console.log(names)
    for (let item of this.items){
      console.log(item)
      if (names.includes(item.name)){
        itemList.push(item)
      }
    }
    console.log(itemList)

    this.callback(itemList);
  }


  /* -------------------------------------------- */

  _onShowItemDetails(event) {
    if ($(event.target).prop("tagName") == "INPUT" || $(event.target).prop("tagName") == "IMG")
      return;

    event.preventDefault();
    const toggler = $(event.currentTarget);
    const item = toggler.parents('.item');
    const description = item.find('.item-description');

    toggler.toggleClass('open');
    description.slideToggle();
  }

  /* -------------------------------------------- */

  _echoItemDescription(event) {
    event.preventDefault();
    const li = event.currentTarget.closest(".item");
    let item = this.actor.items.get(li.dataset.itemId);

    item.toMessage();
  }

  /* -------------------------------------------- */
  _updateItemTotals(event){
    event.preventDefault();
    console.log(event)
    if (event.currentTarget.checked){
      this.curr += 1;
    } else {
      this.curr -= 1;
    }
    console.log(this.curr)
    console.log(this.count)
    if (this.curr >= this.count){
      $(".check-equipment").each((i, val) => {
        if (!$(val).is(":checked")) {
          $(val)[0].disabled = true;
          console.log("disabled!")
          console.log($(val))
        }
      });
    } else {
      $(".check-equipment").each((i, val) => {
        $(val)[0].disabled = false;
      });
    }
  }


  /* -------------------------------------------- */



}