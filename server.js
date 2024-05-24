const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const port = process.env.PORT || 4000;
const index = require("./routes/index");

const app = express();
app.use(index);
const server = http.createServer(app);

const Offer = require("./model/offer");
const Premio = require('./model/premios');
const mongoose = require("mongoose");

const uri =
  "mongodb+srv://ahuertas:eciclaje123456@eciclaje.j4fwinu.mongodb.net/?retryWrites=true&w=majority&appName=eciclaje";

async function connect() {
  try {
    await mongoose.connect(uri);
    console.log("Connected to MongoDB");
  } catch (error) {
    console.error(error);
  }
}

connect();

const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});
let ofertas = {};
let ofertasSinTomar = {}
let ofertasenCurso = {};
let usuarios = {}
let nombre = ""
let mispremios = {}
let premios = [
    
]


async function poblarListaDesdeBaseDeDatos() {
    try {
      
            

        const premiosDesdeBD = await Premio.find({});   
        premios = premiosDesdeBD.map(({ nombre, puntaje }) => ({ nombre, puntaje }));

        //const OfertasDesdeBD = await Offer.find({});   
        //let ofertas = OfertasDesdeBD.map(({ id, user, name, address, status , material, quantity, completedQuantity}) => ({id, user, name, address, status , material, quantity, completedQuantity}));
      
    
        // console.log("Premios obtenidos desde la base de datos:");
        // console.log(premios);

        //// console.log("ofertos obtenidos desde la base de datos:");
        //// console.log(ofertas);
  
  
    } catch (error) {
      console.error('Error al poblar la lista desde la base de datos:', error);
    }
}
let id = 0
io.on("connection", (socket) => {


    // // console.log("New client connected", socket.id);

    socket.on("disconnect", () => {
        // // console.log("Client disconnected", socket.id);
    });
    socket.on("setName", nombreenviado => {
        nombre = nombreenviado
        if (!usuarios[nombre]){
            usuarios[nombre]={puntos:0}
        }
        const premiosobject = Object.entries(premios).filter(([key, value]) => value.puntaje <= usuarios[nombreenviado].puntos);
        io.emit("premios", premiosobject)
        // console.log(nombre)

        if (!mispremios[nombreenviado]){
            mispremios[nombreenviado]={datos:[]}
        }
        io.emit("mispremios", mispremios)
    })


    socket.on("new-offer", async (offer) => {

        offer[1].data.unshift(offer[0]);
        offer[1].data.unshift(id);
        offer[1].data.push(0)
        
        try {
            // Crear una nueva instancia del modelo Offer con los datos recibidos
            const newOffer = new Offer({
                id: offer[1].data[0], 
                user: offer[1].data[1],
                name: offer[1].data[2],
                address: offer[1].data[3],
                status: offer[1].data[4],
                material: offer[1].data[5],
                quantity: offer[1].data[6],
                completedQuantity: offer[1].data[7] 
            });
    
            // Guardar la nueva oferta en la base de datos
            await newOffer.save();
    
            // Emitir eventos de actualización si es necesario
            // ...
    
            // console.log("Nueva oferta guardada en la base de datos:", newOffer);
        } catch (error) {
            console.error("Error al guardar la oferta:", error);
        }

        // // console.log("New offer received:", offer);
        // // console.log("identificador", offer[0]+offer[1].data[0])
        ofertas[offer[0]+offer[1].data[0]] = offer[1];
        // // console.log("oferta: ",offer[1] )
        ofertasSinTomar[offer[0]+offer[1].data[0]] = offer[1];
        io.emit("update-offers", Object.values(ofertasSinTomar));
        io.emit("myupdate-offers", ofertasenCurso);
        io.emit("myupdate-offers_usser", ofertas);
        io.emit("puntos", usuarios)
        // console.log( "ofertas:::", ofertas)
        id +=1
        
 
    });

    

    socket.on("canCreate",nombre => {
        const filteredOffersUser = Object.entries(ofertas).filter(([key, value]) => value.data[1] === nombre);
        if(filteredOffersUser.length > 0){
            // console.log("canCreateRespons:", filteredOffersUser)
            socket.emit("canCreateResponse", filteredOffersUser )
        }
        else{
            socket.emit("canCreateResponse",[ [ 'a0', { data: ["l", "l", "l", "l", "l", "l"] } ]])
        }
        
        
    })

    socket.on("endState", data =>{
        const filteredOffers = Object.entries(ofertasenCurso).filter(([key, value]) => value.data[0] === data[1]);
        let filteredOffersUser = Object.entries(ofertas)
        .filter(([key, value]) => value.data[0] === data[1])
        let creador = filteredOffersUser[0][1].data[1]
        // // console.log("filtradas al finalizar", filteredOffersUser[0][1].data[1])
        // // console.log("filtradas al finalizar data", data)
        filteredOffers[0][1].data[4] = "Recogido";
        ofertasenCurso[data[0]+data[1]] = filteredOffers[0][1];
        // // console.log(ofertasenCurso, "ofertaaaaas")

        filteredOffersUser[0][1].data[4] = "Finalizado";
        
        let bono = 0
        if(filteredOffersUser[0][1].data[5] == "Plásticos"){
            bono = 6
        }
       else if(filteredOffersUser[0][1].data[5] == "Metales"){
            bono = 9
        }
        else if(filteredOffersUser[0][1].data[5] == "Vidrio"){
            bono = 7
        }
        else if(filteredOffersUser[0][1].data[5] == "Electrónicos"){
            bono = 10
        }
        else if(filteredOffersUser[0][1].data[5] == "Papel/Cartón"){
            bono = 5
        }

        let puntaje = bono * filteredOffersUser[0][1].data[6]



        usuarios[creador].puntos += puntaje
        // console.log("usuarios", usuarios)
        const premiosobject = Object.entries(premios).filter(([key, value]) => value.puntaje <= usuarios[creador].puntos);
        // console.log("material: ", filteredOffersUser[0][1].data[5])
        ofertas[creador+data[1]] = filteredOffersUser[0][1];
        io.emit("update-offers", Object.values(ofertasSinTomar));
        io.emit("myupdate-offers", ofertasenCurso);
        io.emit("myupdate-offers_usser", ofertas);
        io.emit("puntos", usuarios)
        io.emit("premios", premiosobject)
        // console.log("premios restantes:", premiosobject)
        // console.log(usuarios)

    })

    

    

    socket.on("take-offer", (offerId) => {
        const filteredOffers = Object.entries(ofertasSinTomar).filter(([key, value]) => value.data[0] === offerId[1]);
        const filteredOffersUser = Object.entries(ofertas).filter(([key, value]) => value.data[0] === offerId[1]);
    
        if (filteredOffers.length > 0 && filteredOffersUser.length > 0) {
            if (!(ofertasenCurso[filteredOffers[0][0]])) {
                const ofertaTomada = JSON.parse(JSON.stringify(filteredOffers[0][1]));
                const ofertaTomadaUsuario = JSON.parse(JSON.stringify(filteredOffersUser[0][1]));
    
                ofertaTomada.data[4] = "Asignado";
                ofertaTomadaUsuario.data[4] = "Asignado a recolector";
                // // console.log("ofertas en curso antes", ofertasenCurso)
                ofertasenCurso[offerId[0]+offerId[1]] = ofertaTomada;
                ofertasenCurso[offerId[0]+offerId[1]].data.push(ofertasenCurso[offerId[0]+offerId[1]].data[1])

                ofertasenCurso[offerId[0]+offerId[1]].data[1] = offerId[0]
                ofertas[filteredOffersUser[0][0]] = ofertaTomadaUsuario;
                // // console.log("ofertas en curso", ofertasenCurso[offerId[0]+offerId[1]].data[1])
                delete ofertasSinTomar[filteredOffers[0][0]];
    
                // Emitir actualizaciones
                io.emit("update-offers", Object.values(ofertasSinTomar));
                io.emit("myupdate-offers", ofertasenCurso);
                io.emit("myupdate-offers_usser", ofertas);
                io.emit("puntos", usuarios)
            }
        } else {
            // // console.log("No se encontró la oferta en uno de los diccionarios.");
        }
    });

    socket.on('takePrice', data =>{
        const premiosobject = Object.entries(premios).filter(([key, value]) => value.nombre === data[0]);
        // // console.log("premiosddd:",premiosobject[0][1])
        usuarios[data[1]].puntos -= premiosobject[0][1].puntaje
        io.emit("puntos", usuarios)
        
        const premiosupdateobject = Object.entries(premios).filter(([key, value]) => value.puntaje <= usuarios[data[1]].puntos);
        console.log("puntos restantes", premiosupdateobject)
        io.emit("premios", premiosupdateobject)
        if (!mispremios[data[1]]){
            mispremios[data[1]]={datos:[]}
        }
        if(premiosobject.length > 0){
            mispremios[data[1]].datos.push(premiosobject)
        }
        
        io.emit("mispremios", mispremios)
        // console.log("mis premiso en take:", mispremios[data[1]].datos[0][0])

    })

    socket.on("getPoints", name =>{
        const pointsFiltred = Object.entries(usuarios).filter(([key, value]) => key === name);
        // console.log("points filtred", pointsFiltred[0][1].puntos)
        // console.log("nombre:", name)
        // console.log("points filtred usuarios", usuarios)
        socket.emit("sendPoints", pointsFiltred[0][1].puntos)
    })
    
 
    socket.on('updateOffers', data =>{
        io.emit("update-offers", Object.values(ofertasSinTomar));
        io.emit("myupdate-offers", ofertasenCurso);
        io.emit("myupdate-offers_usser", ofertas);
        io.emit("puntos", usuarios)

        // // console.log('update offers correct: ',"myupdate-offers", ofertasenCurso)
    })

    // socket.on('offer-taken', (offerId) => {
    //     // Logic to handle the offer being taken
    //     // console.log(`Offer with ID ${offerId} has been taken.`);
    //     // Perform the necessary actions, such as marking the offer as taken
    //   });


});

server.listen(port, () =>  console.log(`Listening on port ${port}`));
poblarListaDesdeBaseDeDatos();