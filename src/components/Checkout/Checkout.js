import { useContext } from "react"
import { CartContext } from "../../context/CartContext"
import { Timestamp, writeBatch } from "firebase/firestore"
import { getDocs, collection, query, where, addDoc, documentId} from "firebase/firestore";
import { db } from "../../config/firebase";
import { useState } from "react";
import CheckoutForm from "../CheckoutForm/CheckoutForm";
import './Checkout.css';


const Checkout = ({imgB})  =>{

    const [loading, setLoading] = useState(false)
    const [orderId, setOrderId] = useState('')

    const { cart, total, clearCart } = useContext(CartContext)

    const totalCarrito = total()
    const createOrder = async ({name, phone, email, password})=>{
        setLoading(true)

        try{
            const objOrder = {
                buyer:{
                    name, phone, email, password
                },
                items: cart,
                total: totalCarrito,
                date: Timestamp.fromDate(new Date())
            }

            const batch= writeBatch(db)

            const outOfStock = []

            const ids = cart.map(prod => prod.id)

            const productsRef = collection (db, "Babyland")

            const productsAddedFromFirestore = await getDocs(query(productsRef, where(documentId(), 'in', ids)))

            const {docs} = productsAddedFromFirestore
            
            docs.forEach(doc => {
                const dataDoc = doc.data()
                const stockDb = dataDoc.stock

                const productAddedToCart = cart.find(prod => prod.id === doc.id)
                const prodQuantity = productAddedToCart?.quantity

                if(stockDb >= prodQuantity){
                    batch.update(doc.ref, { stock: stockDb - prodQuantity})
                } else {
                    outOfStock.push( { id: doc.id, ...dataDoc})
                }
            })

            if(outOfStock.length === 0){
                await batch.commit()

                const orderRef = collection(db, "orders")

                const orderAdded = await addDoc(orderRef, objOrder)

                setOrderId(orderAdded.id)
                clearCart()
            } else {
                console.error('hay productos que estan fuera de stock')
            }

        } catch (error) {
            console.log(error)
        } finally {
            setLoading(false)
        }
    }

    if(loading){
        return <h2 className="mjeCheckout">Aguarde unos instantes por favor...</h2>
    }
    if(orderId){
        return (
            <div className="columns is-vcentered">
                <div className="column is-2"></div>
                <div className="column is-6">
                    <h2 className="mjeCheckout">Gracias por su compra!</h2>
                    <h2 className="mjesCheckout">Puede hacer el seguimiento de su pedido via mail</h2>
                    <h2 className="mjesCheckout">El id de su orden es: {orderId}</h2>
                </div>
                <figure className="column image is-2">
                    <img src={imgB} className="imgCorazon" alt="corazon"/>
                </figure>
            </div>
        )
    }

    return(
        <div>
            <h1 className="titleCheckout">Checkout</h1>
            <CheckoutForm onConfirm={createOrder}/>
        </div>
    )
}

export default Checkout