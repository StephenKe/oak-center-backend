const { MONGO_URL } = process.env;

const config = {
  mongo: { url: MONGO_URL },
};

export default config;
