const P = new Pokedex.Pokedex();

async function get_random_pokemon(){
    const id = Math.floor(Math.random() * 1000) +1
    poke = P.getPokemonByName(id);
    return poke;
}

async function get_random_pokemons(w, h){
    let retorno = [];
    for(let i = 0; i<h; i++){
        for(let j = 0; j<w; j++){
            retorno[i][j] = await get_random_pokemon();
        }
    }
    return retorno;
}