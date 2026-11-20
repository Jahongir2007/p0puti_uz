CREATE TABLE ads (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    user_id BIGINT UNSIGNED NOT NULL,
    vehicle_id BIGINT UNSIGNED NULL,

    type ENUM('driver', 'passenger') NOT NULL,

    from_location VARCHAR(500) NOT NULL,
    to_location VARCHAR(500) NOT NULL,

    departure_date DATE NOT NULL,
    departure_time TIME NULL,

    seats INT UNSIGNED NOT NULL DEFAULT 1,
    price DECIMAL(12,2) NULL,

    luggage_allowed BOOLEAN NOT NULL DEFAULT FALSE,

    description TEXT NULL,

    status ENUM(
        'active',
        'completed',
        'cancelled',
        'expired'
    ) NOT NULL DEFAULT 'active',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_ads_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_ads_vehicle
        FOREIGN KEY (vehicle_id)
        REFERENCES vehicles(id)
        ON DELETE SET NULL
);