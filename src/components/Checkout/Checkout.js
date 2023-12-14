import { useContext } from "react"
import { CartContext } from "../../context/CartContext"
import { Timestamp, writeBatch } from "firebase/firestore"
import { getDocs, collection, query, where, addDoc, documentId} from "firebase/firestore";
import { db } from "../../config/firebase";
import { useState } from "react";
import CheckoutForm from "../CheckoutForm/CheckoutForm";

const Checkout = ()  =>{

    const [loading, setLoading] = useState(false)
    const [orderId, setorderId] = useState('')

    const { cart, total, clearCart } = useContext(CartContext)

    const createOrder = async ({name, phone, mail})=>{
        setLoading(true)

        try{
            const objOrder = {
                buyer:{
                    name, phone, mail
                },
                items: cart,
                total: total,
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
                const prodQuantity = productAddedToCart?.prodQuantity

                if(stockDb >= prodQuantity){
                    batch.update(doc.ref, { stock: stockDb - prodQuantity})
                } else {
                    outOfStock.push( { id: doc.id, ...dataDoc})
                }
            })

            if(outOfStock.length === 0){
                await batch.commit()

                const orderRef = collection(db, 'orders')

                const orderAdded = await addDoc(orderRef, objOrder)

                setorderId(orderAdded.id)
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
        return <h1>Se está generando su orden...</h1>
    }
    if(orderId){
        return <h1>El id de su orden es: {orderId}</h1>
    }

    return(
        <div>
            <h1>Checkout</h1>
            <CheckoutForm onConfirm={createOrder}/>
        </div>
    )
}

export default Checkout