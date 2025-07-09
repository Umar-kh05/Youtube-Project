import { asynchandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"
import { ulpoadOnCloudinary } from "../utils/cloudinary.js"
import { User } from "../models/user.model.js"
import { ApiResponse } from "../utils/ApiResponse.js"


const registerUser = asynchandler(async (req, res) => {

    const { fullname, email, username, password } = req.body

    if ([fullname, email, username, password].some((field) => field?.trim === "")) {
        throw new ApiError(400, "All fields are required!")
    }

    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    })

    if (existedUser) {
        throw new ApiError(409, "Username or Email already exists!")
    }

    const avatarLocalPath = req.files?.avatar[0]?.path;
    const coverImageLocalPath = req.files?.coverImage[0]?.path;
    

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required!")
    }

    const avatar = await ulpoadOnCloudinary(avatarLocalPath);

    const coverImage = await ulpoadOnCloudinary(coverImageLocalPath)

    if (!avatar) {
        throw new ApiError(400, "Avatar file is not uploaded on Cloudinary!")
    }

    const user = await User.create(
        {
            username: username.toLowerCase(),
            email,
            fullname,
            avatar: avatar.url,
            coverImage: coverImage?.url || "",
            password
        }
    )

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken" //The field not required
    )

    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registering the User")

    }

    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered successfully!")
    )
})

export { registerUser }