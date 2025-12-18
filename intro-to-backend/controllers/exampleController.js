// Example controller functions

exports.getExample = (req, res) => {
  res.json({
    success: true,
    message: 'GET request successful',
    data: {
      example: 'This is example data'
    }
  });
};

exports.createExample = (req, res) => {
  const { data } = req.body;
  
  res.status(201).json({
    success: true,
    message: 'POST request successful',
    data: {
      received: data
    }
  });
};
