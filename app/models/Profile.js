import { DataTypes } from "sequelize";

export default (sequelize) => {
    const Profile = sequelize.define("Profile", {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        last_name: DataTypes.STRING,
        first_name: DataTypes.STRING,
        age: DataTypes.INTEGER,
        biography: DataTypes.TEXT,
        country: DataTypes.STRING,
        city: DataTypes.STRING,
        image_url: DataTypes.STRING,
        is_searchable: { type: DataTypes.BOOLEAN, defaultValue: false },
    }, {
        tableName: 'profiles',
        underscored: true
    });

    return Profile;
};
