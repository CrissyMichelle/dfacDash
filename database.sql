-- drop all tables
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS dfacs CASCADE;
DROP TABLE IF EXISTS cooks CASCADE;
DROP TABLE IF EXISTS items CASCADE;
DROP TABLE IF EXISTS meals CASCADE;
DROP TABLE IF EXISTS meal_items CASCADE;
DROP TABLE IF EXISTS nutrition CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS order_meals CASCADE;
DROP TABLE IF EXISTS surrogates CASCADE;
DROP TABLE IF EXISTS tags CASCADE;
DROP TABLE IF EXISTS item_tags CASCADE;
DROP TABLE IF EXISTS customer_likes CASCADE;
DROP TABLE IF EXISTS dfac_items CASCADE;

CREATE TABLE customers (
    id integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    username VARCHAR(25) UNIQUE NOT NULL,
    password text NOT NULL,
    fname text NOT NULL,
    lname text NOT NULL,
    dodid VARCHAR(10) NOT NULL CHECK (LENGTH(dodid) = 10),
    phone_number text,
    meal_card boolean NOT NULL DEFAULT TRUE,
    is_admin boolean NOT NULL DEFAULT FALSE,
    karma_score integer DEFAULT 3,
    email text CHECK (email IS NULL OR (position('@' IN email) > 1)),
    profile_pic text,
    created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp,
    deleted_at timestamp
);

CREATE TABLE dfacs (
    id integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    dfac_name text NOT NULL,
    dfac_logo text,
    street_address text NOT NULL,
    bldg_num text,
    city text NOT NULL,
    state_abb text NOT NULL,
    zip_code integer NOT NULL,
    dfac_phnumber text,
    flash_msg1 text,
    flash_msg2 text,
    bf_hours text,
    lu_hours text,
    dn_hours text,
    bch_hours text,
    sup_hours text,
    order_timebf text,
    order_timelu text,
    order_timedn text,
    order_timebch text,
    order_timesup text,
    created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp,
    deleted_at timestamp
);

CREATE TABLE cooks (
    id integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    dfac_id integer REFERENCES dfacs(id),
    username VARCHAR(25) UNIQUE NOT NULL,
    password text NOT NULL,
    rank text,
    fname text NOT NULL,
    lname text NOT NULL,
    dodid VARCHAR(10) NOT NULL CHECK (LENGTH(dodid) = 10),
    email text CHECK (email IS NULL OR (position('@' IN email) > 1)),
    profile_pic text,
    is_admin boolean NOT NULL DEFAULT FALSE,
    is_manager boolean NOT NULL DEFAULT FALSE,
    update_menu boolean NOT NULL DEFAULT FALSE,
    update_hours boolean NOT NULL DEFAULT FALSE,
    update_meals boolean NOT NULL DEFAULT FALSE,
    update_orders boolean NOT NULL DEFAULT FALSE,
    created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp,
    deleted_at timestamp
);

CREATE TABLE items (
    id integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    menu_item text NOT NULL,
    food_type text NOT NULL,
    recipe_code text,
    description text NOT NULL,
    likes integer DEFAULT 0,
    color_code text,
    sodium_level text,
    item_img text,
    da_standard text   
);

CREATE TABLE meals (
    id integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    dfac_id integer NOT NULL REFERENCES dfacs(id),
    meal_name text,
    description text,
    type text,
    price DECIMAL(5, 2) NOT NULL,
    img_pic text,
    likes integer DEFAULT 0,
    created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp,
    deleted_at timestamp
);

-- Intermediate table between meals and items, addressing the many-to-many relationship.
-- A meal consists of multiple items, and an item can be a part of multiple meals.
-- The PRIMARY KEY ensures that each row of meal-to-item combination is unique.
-- Foreign key constraints ensure that the meals or items in the junction table also
-- exist in the `meals` or `items` tables, respectively.
CREATE TABLE meal_items (
    meal_id integer,
    item_id integer,
    quantity integer DEFAULT 1,
    PRIMARY KEY (meal_id, item_id),
    CONSTRAINT fk_meal FOREIGN KEY (meal_id) REFERENCES meals(id),
    CONSTRAINT fk_item FOREIGN KEY (item_id) REFERENCES items(id)
);

CREATE TABLE nutrition (
    menu_item_id integer REFERENCES items(id),
    calories text,
    protein text,
    carbs text,
    fat text,
    sodium text,
    cholesterol text,
    sugars text
);

CREATE TABLE orders (
    id integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    customer_id integer NOT NULL REFERENCES customers,
    dfac_id integer NOT NULL REFERENCES dfacs,
    comments text,
    to_go boolean NOT NULL DEFAULT TRUE,
    order_timestamp timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ready_for_pickup timestamp,
    picked_up timestamp,
    canceled boolean,
    favorite boolean NOT NULL DEFAULT FALSE
);

-- Intermediate table between orders and meals
CREATE TABLE order_meals (
    id integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    order_id integer NOT NULL REFERENCES orders(id),
    meal_id integer NOT NULL REFERENCES meals(id),
    quantity integer NOT NULL,
    price_at_order DECIMAL(5, 2) NOT NULL, --Populated with the meal price from time of order
    special_instructions text,
    CONSTRAINT fk_order FOREIGN KEY (order_id) REFERENCES orders(id),
    CONSTRAINT fk_meal FOREIGN KEY (meal_id) REFERENCES meals(id)
);

-- Table enabling a customer to order food for another person
CREATE TABLE surrogates (
    id integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    order_id integer NOT NULL,
    customer_id integer NOT NULL,
    surrogate_id text NOT NULL,
    meal_id integer NOT NULL,
    authorization_doc text, --references required paperwork
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (meal_id) REFERENCES meals(id),
    UNIQUE (order_id, surrogate_id)
);

CREATE TABLE tags (
    id integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    dietary text,
    allergen text,
    promotional text,
    descriptive text,
    availability boolean NOT NULL DEFAULT TRUE,
    img_pic text
);

-- Intermediate table between items and tags
CREATE TABLE item_tags (
    item_id integer REFERENCES items(id),
    tag_id integer REFERENCES tags(id),
    PRIMARY KEY (item_id, tag_id)
);

-- Tracks customer likes and prevents a single customer liking the same thing multiple times
CREATE TABLE customer_likes (
    id integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    customer_id integer NOT NULL,
    meal_id integer,
    item_id integer,
    liked_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (meal_id) REFERENCES meals(id),
    FOREIGN KEY (item_id) REFERENCES items(id),
    UNIQUE (customer_id, meal_id, item_id)
);

CREATE TABLE dfac_items (
    dfac_id integer NOT NULL REFERENCES dfacs(id),
    item_id integer NOT NULL REFERENCES items(id)
);

-- Minimal indexing for optimizing performance on common queries
CREATE INDEX idx_customer_id ON orders(customer_id);
CREATE INDEX idx_order_id ON order_meals(order_id);
CREATE INDEX idx_meal_id ON meal_items(meal_id);
CREATE INDEX idx_surrogate_id ON surrogates(surrogate_id);
CREATE INDEX idx_item_id ON item_tags(item_id);
CREATE INDEX idx_dfac_id ON dfac_items(dfac_id);
CREATE INDEX idx_dfacitem_id ON dfac_items(item_id);

-- Trigger function for recording historical price data
CREATE OR REPLACE FUNCTION update_price_at_order()
    RETURNS TRIGGER AS $$
    BEGIN
        NEW.price_at_order := (SELECT price FROM meals WHERE id = NEW.meal_id);
        RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
-- Call the trigger with every new row inserted into `order_meals`
CREATE TRIGGER set_price_at_order
    BEFORE INSERT ON order_meals
    FOR EACH ROW
    EXECUTE FUNCTION update_price_at_order();
