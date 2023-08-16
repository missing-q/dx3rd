await new FilePicker({
    displayMode: 'tiles',
    callback: picked
}).render()

async function picked(file) {
    const icons = {
    "Angel Halo": "icons/svg/angel.svg",
    "Balor" : "icons/svg/eye.svg",
    "Black Dog": "icons/svg/lightning.svg",
    "Bram Stoker": "icons/svg/blood.svg",
    "Chimaera": "icons/svg/pawprint.svg",
    "Common": "icons/svg/aura.svg",
    "Exile": "icons/svg/bones.svg",
    "Hanuman": "icons/svg/sound.svg",
    "Morpheus": "icons/svg/explosion.svg",
    "Neumann": "icons/svg/light.svg",
    "Orcus": "icons/svg/mountain.svg",
    "Ouroboros": "icons/svg/acid.svg",
    "Salamandra": "icons/svg/sun.svg",
    "Solaris": "icons/svg/pill.svg",
    "Renegade": "icons/svg/daze.svg"
    }
    var request = new XMLHttpRequest();
    request.open("GET", `${file}`, false);
    request.send(null)
    var obj = JSON.parse(request.responseText);
    for (const syndrome in obj){
        let abilitylist = obj[syndrome];
        for (var i = 0; i < abilitylist.length; i++){
            let tmp = abilitylist[i];
            let newItem = {
                "name": tmp.name,
                "type": "effect",
                "img": icons[tmp.syndrome],
                "data": {
                    "difficulty": tmp.difficulty,
                    "timing": tmp.timing,
                    "limit": tmp.restrict,
                    "skill": tmp.skill,
                    "target": tmp.target,
                    "range": tmp.range,
                    "description": tmp.description,
                    "syndrome": tmp.syndrome,
                    "level":{
                        "max": tmp.max_lv
                    },
                    "encroach": {
                        "value": tmp.encroach
                    },
                    "uses":{}
                }
            }
            //uses formula parser
            if ((tmp.uses != "-") && (tmp.uses != "Refer") ){
                let uses = tmp.uses.split("/")
                let num = uses[0];
                let freq = uses[1].toLowerCase();
                if (freq == "scenario"){
                    freq = "session"
                }
                if (freq == "scene"){
                    freq = "battle"
                }
                if (num.indexOf('[LV]') != -1){
                    num = num.replace("[LV]", "@level");
                }
                newItem.data.uses.formula_max = num;
                newItem.data.uses.formula_timing = freq;
                newItem.data.uses.active = true
            }
            let res = tmp.restrict
            if (res != "-"){
                res = "" + Number(res * 100)+"%"
            }
            newItem.data.restrict = res
            

            Item.create(newItem)
        }
        console.log("Items done importing! :D")
    }
    
}