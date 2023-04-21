const { validationResult } = require("express-validator");
const fs = require("fs");
const {
  Product,
  Category,
  Subcategory,
  ProductImage,
} = require("../database/models");

module.exports = {
  index: (req, res) => {
    return res.render("admin/adminIndex", {
      session: req.session,
    });
  },
  /*  products: async (req, res) => {
        try {
            const products = await Product.findAll({
                include: [
                    {
                        association: "subcategory",
                        include: {
                            association: "category"
                        }
                    }
                ]
            });
            
            return res.render("admin/adminProducts", {
                session: req.session,
                products
            })
        } catch (error) {
           console.log(error) 
        }
    },  */
  products: (req, res) => {
    Product.findAll({
      include: [
        {
          association: "subcategory",
          include: {
            association: "category",
          },
        },
      ],
    })
      .then((products) => {
        return res.render("admin/adminProducts", {
          session: req.session,
          products,
        });
      })
      .catch((error) => console.log(error));
  },
  create: (req, res) => {
    const CATEGORIES_PROMISE = Category.findAll();
    const SUBCATEGORIES_PROMISE = Subcategory.findAll();

    Promise.all([CATEGORIES_PROMISE, SUBCATEGORIES_PROMISE])
      .then(([categories, subcategories]) => {
        return res.render("admin/adminProductCreateForm", {
          session: req.session,
          categories,
          subcategories,
        });
      })
      .catch((error) => console.log(error));
  },
  store: (req, res) => {
    let errors = validationResult(req);

    if (errors.isEmpty()) {
      let { name, price, discount, subcategory, description } = req.body;

      let newProduct = {
        name,
        price,
        description,
        discount,
        subcategory_id: subcategory,
      };

      Product.create(newProduct)
        .then((product) => {
          if (req.files.length === 0) {
            ProductImage.create({
              image: "default-image.png",
              product_id: product.id,
            }).then(() => {
              return res.redirect("/admin/products");
            });
          } else {
            const files = req.files.map((file) => {
              return {
                image: file.filename,
                product_id: product.id,
              };
            });
            ProductImage.bulkCreate(files).then(() => {
              return res.redirect("/admin/products");
            });
          }
        })
        .catch((error) => console.log(error));
    } else {
      const CATEGORIES_PROMISE = Category.findAll();
      const SUBCATEGORIES_PROMISE = Subcategory.findAll();

      Promise.all([CATEGORIES_PROMISE, SUBCATEGORIES_PROMISE])
        .then(([categories, subcategories]) => {
          return res.render("admin/adminProductCreateForm", {
            session: req.session,
            categories,
            subcategories,
            errors: errors.mapped(),
            old: req.body,
          });
        })
        .catch((error) => console.log(error));
    }
  },
  edit: (req, res) => {
    const productId = req.params.id;
    /* hago la promesa y llamo al metodo Product(esta en la constante que viene de la base de) y findByPk (findByPk. El método findByPk obtiene solo una entrada de la tabla, utilizando la clave principal proporcionada) de productId (la variable de arriba productId)*/
    const PRODUCT_PROMISE = Product.findByPk(productId);
    /* hago la promesa que me trae las categorias */
    const CATEGORIES_PROMISE = Category.findAll();
    /* Hago la promesa que me trae las sub categorias */
    const SUBCATEGORIES_PROMISE = Subcategory.findAll();

    /* Le pasamos el array con todas las promesas */
    Promise.all([PRODUCT_PROMISE, CATEGORIES_PROMISE, SUBCATEGORIES_PROMISE])
    /* dentro de la promesa mandamos le mandamos un array con las variables donde se van a guardar los productos,   */
    .then(([product, categories, subcategories]) => {
        /* Incluimos el render, mandamos a la vista de editar fomulario, las variables del .then */
      res.render("admin/adminProductEditForm", {
        categories,
        subcategories,
        product,
        session: req.session,
      });
    })
    .catch(error => console.log(error))
  },
  update: (req, res) => {
    let errors = validationResult(req);
    /* de los params me trae el id del producto */
    const productId = req.params.id;

    if (errors.isEmpty()) {
    /*  */
      let { 
        name, 
        price, 
        discount, 
        category, 
        subcategory, 
        description 
      } =
        req.body;
      /* el metodo update recibe dos parametros 1) el destructuring  */
      /* le decimos, que primero actualice el producto */
      Product.update({
        name, 
        price, 
        discount, 
        category, 
        subcategory_id: subcategory, 
        description
      }, {
        /* 2) el objeto con where, deonde ledecimos el producto */
        where: {
          id: productId,
        }
      })
      /* capturamos la actualizacion del producto con la promesa .then */
      .then((result) => { /* capturamos el resultado */
      /* si el resultado es verdadero, entonces se actualizo correctamente el producto */
        if(result){
          // Si no reemplaza imagen, y el resultado es 0 me lleva a la vistas products y no se sube nada nuevo
          if(req.files.length === 0){
            return res.redirect("/admin/products");
            /* en el caso de que si halla enviado img y las quiera remplazar */
          } else {
            // 1- Obtener todas las imagenes del producto a actualizar
            ProductImage.findAll({
              where : {
                product_id: productId
              }
            })
            .then((images) => {
              // 2- obtener el nombre de las imagenes a eliminar
              // 3- Eliminar los archivos
              images.forEach((productImage) => {
                const MATCH = fs.existsSync("./public/images/productos/", productImage.image);
                if(MATCH){
                  try {
                    fs.unlinkSync(`./public/images/productos/${productImage.image}`)
                  } catch (error) {
                    throw new Error(error)                    
                  }
                }else{
                  console.log("No se encontró el archivo");
                }
              })
              // 4- Eliminamos las imagenes de la DB (destroy)
              ProductImage.destroy({
                where: {
                  product_id: productId,
                }
              })
              .then(() => {
                // 5- Crear los registros de las nuevas imagenes
                const files = req.files.map((file) => {
                  return {
                    image: file.filename,
                    product_id: productId,
                  };
                });
                ProductImage.bulkCreate(files)
                .then(() => {
                  return res.redirect("/admin/products");
                });
              })
            })
          }
        }
      })
    } else {
      const PRODUCT_PROMISE = Product.findByPk(productId);
      const CATEGORIES_PROMISE = Category.findAll();
      const SUBCATEGORIES_PROMISE = Subcategory.findAll();

      Promise.all([PRODUCT_PROMISE, CATEGORIES_PROMISE, SUBCATEGORIES_PROMISE])
      .then(([product, categories, subcategories]) => {
        res.render("admin/adminProductEditForm", {
          categories,
          subcategories,
          product,
          errors: errors.mapped(),
          old: req.body,
          session: req.session,
        });
      })
      .catch(error => console.log(error))
    }
  },
  destroy: (req, res) => {
    const productId = req.params.id;

    ProductImage.findAll({
      where : {
        product_id: productId
      }
    })
    .then((images) => {
      images.forEach((productImage) => {
        const MATCH = fs.existsSync("./public/images/productos/", productImage.image);
        if(MATCH){
          try {
            fs.unlinkSync(`./public/images/productos/${productImage.image}`)
          } catch (error) {
            throw new Error(error)                    
          }
        }else{
          console.log("No se encontró el archivo");
        }
      })
      ProductImage.destroy({
        where: {
          product_id: productId,
        }
      })
      .then(() => {
        Product.destroy({
          where: {
            id: productId
          }
        })
        .then(() => res.redirect("/admin/products"))
      })
    })
    .catch(error => console.log(error))
  },
};
